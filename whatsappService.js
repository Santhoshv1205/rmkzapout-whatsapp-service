import fs from "fs";
import path from "path";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

const SESSION_PATH =
  process.env.WHATSAPP_SESSION_PATH ||
  (process.platform === "win32"
    ? path.join(process.cwd(), ".sessions")
    : "/app/sessions");
const CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || "rmkzapout";
const SEND_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 45000);
const STARTUP_RETRY_COUNT = Number(process.env.WHATSAPP_STARTUP_RETRY_COUNT || 5);
const STARTUP_RETRY_DELAY_MS = Number(process.env.WHATSAPP_STARTUP_RETRY_DELAY_MS || 10000);
const CHROMIUM_LOCK_FILE_NAMES = new Set([
  "SingletonLock",
  "SingletonSocket",
  "SingletonCookie",
  "SingletonSocket.lock"
]);

let client = null;
let clientInitialization = null;
let qrImage = null;
let ready = false;
let readyResolver = null;
let readyPromise = null;

function ensureSessionPath() {
  fs.mkdirSync(SESSION_PATH, { recursive: true });
}

function createReadyPromise() {
  readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });
}

function getSessionDirPath() {
  return path.join(SESSION_PATH, `session-${CLIENT_ID}`);
}

function clearStaleChromiumLocks() {
  const sessionDir = getSessionDirPath();

  if (!fs.existsSync(sessionDir)) {
    return;
  }

  const stack = [sessionDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".org.chromium.Chromium.scoped_dir")) {
          try {
            fs.rmSync(entryPath, { recursive: true, force: true });
            console.log("Removed stale Chromium temp dir:", entryPath);
          } catch (error) {
            console.error("Failed to remove Chromium temp dir:", entryPath, error.message);
          }
          continue;
        }

        stack.push(entryPath);
        continue;
      }

      if (!CHROMIUM_LOCK_FILE_NAMES.has(entry.name)) {
        continue;
      }

      try {
        fs.rmSync(entryPath, { force: true });
        console.log("Removed stale Chromium lock:", entryPath);
      } catch (error) {
        console.error("Failed to remove Chromium lock:", entryPath, error.message);
      }
    }
  }
}

function getPuppeteerOptions() {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;

  const options = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--no-first-run",
      "--no-zygote"
    ]
  };

  if (executablePath) {
    options.executablePath = executablePath;
  }

  return options;
}

function buildClient() {
  ensureSessionPath();
  clearStaleChromiumLocks();
  createReadyPromise();

  const nextClient = new Client({
    authStrategy: new LocalAuth({
      clientId: CLIENT_ID,
      dataPath: SESSION_PATH
    }),
    puppeteer: getPuppeteerOptions()
  });

  nextClient.on("qr", async (qr) => {
    console.log("QR received");
    ready = false;
    qrImage = await QRCode.toDataURL(qr);
  });

  nextClient.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  nextClient.on("ready", async () => {
    ready = true;
    qrImage = null;
    console.log("WhatsApp client is ready");
    readyResolver?.();
    readyResolver = null;

    try {
      const state = await nextClient.getState();
      console.log("WhatsApp state:", state);
    } catch (error) {
      console.error("Failed to read WhatsApp state:", error.message);
    }
  });

  nextClient.on("auth_failure", (message) => {
    ready = false;
    console.error("WhatsApp authentication failed:", message);
  });

  nextClient.on("disconnected", async (reason) => {
    ready = false;
    console.log("WhatsApp disconnected:", reason);

    if (client !== nextClient) {
      return;
    }

    client = null;
    clientInitialization = null;

    try {
      await nextClient.destroy();
    } catch (error) {
      console.error("WhatsApp destroy failed:", error.message);
    }

    setTimeout(() => {
      startWhatsApp().catch((error) => {
        console.error("WhatsApp reinitialize failed:", error);
      });
    }, 3000);
  });

  return nextClient;
}

async function ensureClientReady() {
  await startWhatsApp();

  if (!client || !ready) {
    throw new Error("WhatsApp client not ready");
  }

  return client;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

function sleep(timeoutMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}

function isRecoverableSendError(error) {
  return (
    error?.message?.includes("detached Frame") ||
    error?.message?.includes("detached frame") ||
    error?.message?.includes("Execution context was destroyed") ||
    error?.message?.includes("timed out")
  );
}

function isProfileInUseError(error) {
  return (
    error?.message?.includes("profile appears to be in use") ||
    error?.message?.includes("Chromium has locked the profile") ||
    error?.message?.includes("process_singleton_posix")
  );
}

async function resetClient(activeClient, reason) {
  console.log("Resetting WhatsApp client:", reason);
  ready = false;
  readyResolver = null;
  readyPromise = null;

  try {
    await activeClient.destroy();
  } catch (destroyError) {
    console.error("WhatsApp destroy failed during reset:", destroyError.message);
  }

  client = null;
  clientInitialization = null;
}

export const startWhatsApp = async () => {
  if (ready && client) {
    return client;
  }

  if (clientInitialization) {
    return clientInitialization;
  }

  client = buildClient();

  clientInitialization = (async () => {
    let lastError;

    for (let attempt = 1; attempt <= STARTUP_RETRY_COUNT; attempt += 1) {
      try {
        if (attempt > 1) {
          clearStaleChromiumLocks();
          console.log(`Retrying WhatsApp startup (${attempt}/${STARTUP_RETRY_COUNT})`);
        }

        await client.initialize();
        await readyPromise;
        return client;
      } catch (error) {
        lastError = error;

        if (!isProfileInUseError(error) || attempt === STARTUP_RETRY_COUNT) {
          break;
        }

        console.log(
          `WhatsApp profile is still in use. Waiting ${STARTUP_RETRY_DELAY_MS}ms before retry.`
        );
        await sleep(STARTUP_RETRY_DELAY_MS);
      }
    }

    clientInitialization = null;
    client = null;
    ready = false;
    throw lastError;
  })();

  return clientInitialization;
};

export const isClientReady = () => ready;

export const getQR = () => qrImage;

export const sendMessage = async (number, message) => {
  const activeClient = await ensureClientReady();

  let cleanNumber = String(number || "").replace(/\D/g, "");

  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }

  if (!cleanNumber) {
    throw new Error("Invalid number");
  }

  const chatId = `${cleanNumber}@c.us`;

  console.log("Sending message to:", chatId);

  try {
    const isRegistered = await withTimeout(
      activeClient.isRegisteredUser(chatId),
      SEND_TIMEOUT_MS,
      "WhatsApp registration check"
    );

    if (!isRegistered) {
      throw new Error("Target number is not registered on WhatsApp");
    }

    const result = await withTimeout(
      activeClient.sendMessage(chatId, message),
      SEND_TIMEOUT_MS,
      "WhatsApp send"
    );
    console.log("Message sent successfully");
    return result;
  } catch (error) {
    console.error("WhatsApp send failed:", error);

    if (!isRecoverableSendError(error)) {
      throw error;
    }

    console.log("Retrying send after WhatsApp client recovery");
    await resetClient(activeClient, error.message);

    const recoveredClient = await ensureClientReady();
    const isRegistered = await withTimeout(
      recoveredClient.isRegisteredUser(chatId),
      SEND_TIMEOUT_MS,
      "WhatsApp registration check retry"
    );

    if (!isRegistered) {
      throw new Error("Target number is not registered on WhatsApp");
    }

    return withTimeout(
      recoveredClient.sendMessage(chatId, message),
      SEND_TIMEOUT_MS,
      "WhatsApp send retry"
    );
  }
};
