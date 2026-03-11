import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg

import fs from "fs"
import path from "path"

export let isReady = false

const SESSION_PATH = "/app/sessions"

function clearLocks() {

  const lockFiles = [
    "SingletonLock",
    "SingletonSocket",
    "SingletonCookie"
  ]

  lockFiles.forEach(file => {

    const filePath = path.join(SESSION_PATH, file)

    if (fs.existsSync(filePath)) {
      try {
        fs.rmSync(filePath, { force: true })
        console.log("Removed Chromium lock:", file)
      } catch (err) {
        console.log("Lock remove error:", err.message)
      }
    }

  })

}

clearLocks()

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: SESSION_PATH
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process"
    ]
  }
})

client.on("qr", () => {
  console.log("QR generated. Open /qr")
})

client.on("ready", () => {
  isReady = true
  console.log("WhatsApp Ready")
})

client.on("authenticated", () => {
  console.log("WhatsApp Authenticated")
})

client.on("disconnected", (reason) => {
  isReady = false
  console.log("WhatsApp Disconnected:", reason)
})

export default client