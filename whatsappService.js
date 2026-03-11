import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

let client;
let qrImage = null;
let ready = false;

export const startWhatsApp = async () => {

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding"
  ]
}
  });

  client.on("qr", async (qr) => {

    console.log("QR received");

    qrImage = await QRCode.toDataURL(qr);

  });

  client.on("ready", async () => {

  console.log("WhatsApp client is ready");

  ready = true;

  const state = await client.getState();

  console.log("WhatsApp state:", state);

});

  client.on("authenticated", () => {

    console.log("WhatsApp authenticated");

  });

  client.on("disconnected", (reason) => {

    console.log("WhatsApp disconnected:", reason);

    ready = false;

  });

  await client.initialize();
};

export const isClientReady = () => ready;

export const getQR = () => qrImage;

export const sendMessage = async (number, message) => {

  if (!ready) {
    throw new Error("WhatsApp client not ready");
  }

  let cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber;
  }

  const chatId = `${cleanNumber}@c.us`;

  console.log("Checking chat:", chatId);

  try {

    const chat = await client.getChatById(chatId);

    console.log("Chat found");

    const result = await chat.sendMessage(message);

    console.log("Message sent successfully");

    return result;

  } catch (error) {

    console.error("WhatsApp send failed:", error);

    throw error;
  }
};