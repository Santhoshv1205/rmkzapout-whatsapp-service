import client, { isReady } from "./whatsappClient.js"

export const startWhatsApp = async () => {
  await client.initialize()
}

export const sendWhatsAppMessage = async (number, message) => {

  if (!isReady) {
    throw new Error("WhatsApp client not ready")
  }

  try {

    let cleanNumber = number.replace(/\D/g, "")

    if (cleanNumber.length === 10) {
      cleanNumber = "91" + cleanNumber
    }

    const chatId = `${cleanNumber}@c.us`

    await client.sendMessage(chatId, message)

    console.log("Message sent to:", cleanNumber)

  } catch (error) {

    console.error("Send message error:", error.message)
    throw error

  }

}