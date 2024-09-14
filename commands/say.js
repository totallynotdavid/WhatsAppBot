const {
    getRandomVoice,
    isValidVoice,
    synthesizeSpeech,
} = require("../services/amazon-polly");
const { sendMessage } = require("../services/message");
const { sendAudioBuffer } = require("../services/audio");

async function handleTextToSpeechCommand(client, message, args) {
    let text = "";
    let voiceId = getRandomVoice();

    if (args.length === 0) {
        if (message.hasQuotedMsg) {
            text = message.quotedMsg.body;
        } else {
            await sendMessage(
                client,
                message,
                "Proporciona texto o responde a un mensaje."
            );
            return;
        }
    } else {
        if (args[0].startsWith("-")) {
            const possibleVoiceId = args[0].slice(1);
            if (isValidVoice(possibleVoiceId)) {
                voiceId = possibleVoiceId;
                text = args.slice(1).join(" ");
            } else {
                await sendMessage(
                    client,
                    message,
                    `Voz inválida. Usando voz aleatoria.`
                );
                text = args.join(" ");
            }
        } else {
            text = args.join(" ");
        }
    }

    if (text.length > 1000) {
        await sendMessage(
            client,
            message,
            "Texto demasiado largo. Límite: 1000 caracteres."
        );
        return;
    }

    try {
        const audioBuffer = await synthesizeSpeech(text, voiceId);
        await sendAudioBuffer(client, message, audioBuffer);
        await sendMessage(
            client,
            message,
            `Voz utilizada: ${voiceId}`
        );
    } catch (error) {
        console.error("Error in text-to-speech command:", error);
        await sendMessage(
            client,
            message,
            "Error al procesar la solicitud. Inténtalo de nuevo ahora o más tarde."
        );
    }
}

module.exports = { handleTextToSpeechCommand };