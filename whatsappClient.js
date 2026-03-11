import pkg from "whatsapp-web.js"

const { Client, LocalAuth } = pkg

export let latestQR = null
export let isReady = false

const client = new Client({
  authStrategy: new LocalAuth({
  dataPath: "/app/sessions"
}),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    protocolTimeout: 300000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote"
    ]
  }
})

client.on("qr", (qr) => {
  latestQR = qr
  isReady = false
  console.log("QR generated. Open /qr")
})

client.on("authenticated", () => {
  console.log("WhatsApp Authenticated")
})

client.on("ready", async () => {

  console.log("WhatsApp Ready")

  // give WhatsApp Web time to fully stabilize
  await new Promise(resolve => setTimeout(resolve, 5000))

  isReady = true
  latestQR = null
})

client.on("disconnected", (reason) => {
  console.log("WhatsApp disconnected:", reason)
  isReady = false
})

client.initialize()

export default client