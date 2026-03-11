import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startWhatsApp, sendMessage } from "./whatsappService.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("RMK ZapOut WhatsApp Service Running");
});

app.post("/send-message", async (req, res) => {
  try {
    const { number, message } = req.body;

    await sendMessage(number, message);

    res.json({
      success: true,
      message: "Message sent"
    });
  } catch (error) {
    console.error(error);

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