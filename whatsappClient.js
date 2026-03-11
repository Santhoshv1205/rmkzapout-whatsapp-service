import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg

import fs from "fs"
import path from "path"

const SESSION_PATH = "/app/sessions"

function clearChromiumLocks() {

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

clearChromiumLocks()

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: SESSION_PATH
  }),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-dev-tools",
      "--no-first-run",
      "--no-zygote",
      "--single-process"
    ]
  }
})

export default client