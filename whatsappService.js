import pkg from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = pkg;

let client;
let qrImage = null;

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
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  await client.initialize();
};

export const getQR = () => qrImage;

export const sendMessage = async (number, message) => {
  let cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber;
  }

  const chatId = `${cleanNumber}@c.us`;

  await client.sendMessage(chatId, message);
};