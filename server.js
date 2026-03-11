import express from "express"
import QRCode from "qrcode"
import client from "./whatsappClient.js"
import { startWhatsApp, sendWhatsAppMessage } from "./whatsappService.js"

const app = express()
app.use(express.json())

let latestQR = null

client.on("qr", qr => {
  latestQR = qr
})

app.get("/qr", async (req, res) => {

  if (!latestQR) {
    return res.send("No QR available or already authenticated")
  }

  const qrImage = await QRCode.toDataURL(latestQR)

  res.send(`<img src="${qrImage}" />`)

})

app.post("/send-message", async (req, res) => {

  try {

    const { number, message } = req.body

    await sendWhatsAppMessage(number, message)

    res.json({ success: true })

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    })

  }

})

const PORT = process.env.PORT || 8080

app.listen(PORT, async () => {

  console.log("WhatsApp Service running on port", PORT)

  await startWhatsApp()

})