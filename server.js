import express from "express"
import cors from "cors"
import qrcode from "qrcode"
import { latestQR, isReady } from "./whatsappClient.js"
import { sendWhatsAppMessage } from "./whatsappService.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("WhatsApp Service Running")
})

app.get("/status", (req, res) => {
  res.json({
    ready: isReady
  })
})

app.get("/qr", async (req, res) => {
  if (!latestQR) {
    return res.send("QR not available")
  }

  const qrImage = await qrcode.toDataURL(latestQR)

  res.send(`
    <h2>Scan WhatsApp QR</h2>
    <img src="${qrImage}" />
  `)
})

app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body

    if (!number || !message) {
      return res.status(400).json({
        error: "Number and message required"
      })
    }

    await sendWhatsAppMessage(number, message)

    res.json({
      success: true
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("WhatsApp Service running on port", PORT)
})