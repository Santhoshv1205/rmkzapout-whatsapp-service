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
        "--disable-dev-shm-usage"
      ]
    }
  });

  client.on("qr", async (qr) => {
    console.log("QR received");
    qrImage = await QRCode.toDataURL(qr);
  });

  client.on("ready", () => {
    console.log("WhatsApp client is ready");
    ready = true;
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

  return await client.sendMessage(chatId, message);
};