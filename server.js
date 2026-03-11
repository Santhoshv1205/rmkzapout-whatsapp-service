import express from "express";
import bodyParser from "body-parser";
import qrcode from "qrcode";
import client from "./whatsappClient.js";

import {
  sendWhatsAppMessage,
  getStatus,
  startWhatsApp
} from "./whatsappService.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

let latestQR = null;

client.on("qr", async (qr) => {
  latestQR = await qrcode.toDataURL(qr);
});

app.get("/", (req, res) => {
  res.send("WhatsApp Service Running");
});

app.get("/qr", (req, res) => {
  if (!latestQR) {
    return res.send("QR not generated yet");
  }

  res.send(`
  <html>
  <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
  <img src="${latestQR}" />
  </body>
  </html>
  `);
});

app.get("/status", (req, res) => {
  res.json(getStatus());
});

app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;

    await sendWhatsAppMessage(number, message);

    res.json({
      success: true,
      message: "Message sent"
    });

  } catch (err) {

    console.error("Send message error:", err.message);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
});

app.listen(PORT, async () => {

  console.log(`WhatsApp Service running on port ${PORT}`);

  await startWhatsApp();

});