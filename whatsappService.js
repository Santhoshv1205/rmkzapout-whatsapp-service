import client, { isReady } from "./whatsappClient.js"

export const sendWhatsAppMessage = async (number, message) => {

  if (!isReady) {
    throw new Error("WhatsApp client not ready")
  }

  let cleanNumber = number.replace(/\D/g, "")

  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber
  }

  const chatId = `${cleanNumber}@c.us`

  try {

    await client.sendMessage(chatId, message)

    console.log("Message sent to:", cleanNumber)

    return true

  } catch (err) {

    console.error("Send message error:", err.message)
    throw err

  }
}