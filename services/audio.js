const fs = require("fs").promises;
const fetch = require("node-fetch");
const { MessageMedia } = require("whatsapp-web.js");

async function downloadAudio(url, filePath) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);
}

async function sendAudio(client, message, filePath) {
    try {
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(message.from, media, {
            sendAudioAsVoice: true,
        });
    } catch (error) {
        console.error("Error sending audio:", error);
        throw error;
    }
}

async function sendAudioBuffer(client, message, audioBuffer) {
    try {
        const media = new MessageMedia(
            "audio/mpeg",
            audioBuffer.toString("base64")
        );
        await client.sendMessage(message.from, media, {
            sendAudioAsVoice: true,
        });
    } catch (error) {
        console.error("Error sending audio buffer:", error);
        throw error;
    }
}

module.exports = { downloadAudio, sendAudio, sendAudioBuffer };
