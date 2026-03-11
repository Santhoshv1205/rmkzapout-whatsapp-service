import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import fs from "fs";
import path from "path";

const SESSION_PATH = "/app/sessions";

function clearLocks() {
  const locks = [
    "SingletonLock",
    "SingletonSocket",
    "SingletonCookie"
  ];

  locks.forEach((file) => {
    const filePath = path.join(SESSION_PATH, file);

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
      console.log("Removed lock:", filePath);
    }
  });
}

clearLocks();

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
});

export default client;