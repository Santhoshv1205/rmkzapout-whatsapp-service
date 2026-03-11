import client, { isReady } from "./whatsappClient.js"

export const startWhatsApp = async () => {
  await client.initialize()
}

export const sendWhatsAppMessage = async (number, message) => {

  if (!isReady) {
    throw new Error("WhatsApp client not ready")
  }

  let cleanNumber = number.replace(/\D/g, "")

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber
  }

  const chatId = `${cleanNumber}@c.us`

  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {

    try {

      await client.sendMessage(chatId, message)

      console.log("Message sent to:", cleanNumber)

      return

    } catch (error) {

      attempts++

      console.log(`Send attempt ${attempts} failed:`, error.message)

      if (attempts >= maxAttempts) {
        console.error("Final send message failure:", error.message)
        throw error
      }

      await new Promise(resolve => setTimeout(resolve, 3000))

    }

  }

}