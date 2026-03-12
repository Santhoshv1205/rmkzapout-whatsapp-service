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
const CHROMIUM_LOCK_FILES = [
  "SingletonLock",
  "SingletonSocket",
  "SingletonCookie",
  "SingletonSocket.lock",
  ".org.chromium.Chromium.scoped_dir"
];

let client = null;
let clientInitialization = null;
let qrImage = null;
let ready = false;

function ensureSessionPath() {
  fs.mkdirSync(SESSION_PATH, { recursive: true });
}

function getSessionDirPath() {
  return path.join(SESSION_PATH, `session-${CLIENT_ID}`);
}

function clearStaleChromiumLocks() {
  const sessionDir = getSessionDirPath();

  if (!fs.existsSync(sessionDir)) {
    return;
  }

  for (const file of CHROMIUM_LOCK_FILES) {
    const filePath = path.join(sessionDir, file);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      fs.rmSync(filePath, { recursive: true, force: true });
      console.log("Removed stale Chromium lock:", filePath);
    } catch (error) {
      console.error("Failed to remove Chromium lock:", filePath, error.message);
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

function isRecoverableSendError(error) {
  return (
    error?.message?.includes("detached Frame") ||
    error?.message?.includes("detached frame") ||
    error?.message?.includes("Execution context was destroyed") ||
    error?.message?.includes("timed out")
  );
}

async function resetClient(activeClient, reason) {
  console.log("Resetting WhatsApp client:", reason);
  ready = false;

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

  clientInitialization = client.initialize()
    .then(() => client)
    .catch((error) => {
      clientInitialization = null;
      client = null;
      ready = false;
      throw error;
    });

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
    return withTimeout(
      recoveredClient.sendMessage(chatId, message),
      SEND_TIMEOUT_MS,
      "WhatsApp send retry"
    );
  }
};
