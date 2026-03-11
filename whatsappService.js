import client from "./whatsappClient.js";

let isReady = false;

client.on("qr", () => {
  console.log("QR generated. Open /qr");
});

client.on("authenticated", () => {
  console.log("WhatsApp Authenticated");
});

client.on("ready", () => {
  console.log("WhatsApp Ready");
  isReady = true;
});

client.on("disconnected", () => {
  console.log("WhatsApp Disconnected");
  isReady = false;
});

export const startWhatsApp = async () => {
  await client.initialize();
};

export const sendWhatsAppMessage = async (number, message) => {
  if (!isReady) {
    throw new Error("WhatsApp client not ready");
  }

  let cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber;
  }

  const chatId = `${cleanNumber}@c.us`;

  await client.sendMessage(chatId, message);

  console.log("Message sent to:", cleanNumber);
};

export const getStatus = () => {
  return { ready: isReady };
};