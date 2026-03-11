import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startWhatsApp, sendMessage, getQR, isClientReady } from "./whatsappService.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("RMK ZapOut WhatsApp Service Running");
});

app.get("/qr", (req, res) => {
  const qr = getQR();

  if (!qr) {
    return res.send("QR not generated yet. Refresh in a few seconds.");
  }

  res.send(`
    <h2>Scan QR with WhatsApp</h2>
    <img src="${qr}" />
  `);
});

app.get("/status", (req, res) => {
  res.json({
    whatsappReady: isClientReady()
  });
});

app.post("/send-message", async (req, res) => {

  console.log("Incoming message request:", req.body);

  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "number and message required"
      });
    }

    const result = await sendMessage(number, message);

    res.json({
      success: true,
      messageId: result.id._serialized
    });

  } catch (error) {

    console.error("Send error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, async () => {
  console.log(`WhatsApp Service running on port ${PORT}`);
  await startWhatsApp();
});