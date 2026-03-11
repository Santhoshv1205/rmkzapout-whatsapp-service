import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

let client;

export const startWhatsApp = async () => {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    }
  });

  client.on("qr", (qr) => {
    console.log("Scan this QR with WhatsApp:");
    console.log(qr);
  });

  client.on("ready", () => {
    console.log("WhatsApp client is ready");
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  client.on("auth_failure", (msg) => {
    console.error("Auth failure:", msg);
  });

  await client.initialize();
};

export const sendMessage = async (number, message) => {
  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }

  let cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber;
  }

  const chatId = `${cleanNumber}@c.us`;

  await client.sendMessage(chatId, message);
};