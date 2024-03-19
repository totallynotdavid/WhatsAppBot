const {
    PollyClient,
    SynthesizeSpeechCommand,
} = require('@aws-sdk/client-polly');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const REGION = 'us-east-1';
const client = new PollyClient({ region: REGION });

const voiceOptions = {
    Ricardo: 'standard',
    Conchita: 'standard',
    Lucia: 'neural',
    Enrique: 'standard',
    Sergio: 'neural',
    Mia: 'neural',
    Andres: 'neural',
    Lupe: 'neural',
    Penelope: 'neural',
    Miguel: 'standard',
};

function getRandomVoice() {
    const voices = Object.keys(voiceOptions);
    return voices[Math.floor(Math.random() * voices.length)];
}

async function synthesizeSpeech(text, songId, voiceId) {
    const params = {
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: voiceOptions[voiceId],
    };

    try {
        const command = new SynthesizeSpeechCommand(params);
        const data = await client.send(command);

        if (data.AudioStream) {
            const filePath = path.join(__dirname, `../audio/${songId}.mp3`);
            await fs.promises.writeFile(filePath, data.AudioStream);
            return filePath;
        }
    } catch (err) {
        throw new Error(`Failed to synthesize speech: ${err.message}`);
    }
}

async function sendReply(message, replyText, robotEmoji) {
    return message.reply(`${robotEmoji} ${replyText}`);
}

async function handleTextToAudio(
    stringifyMessage,
    message,
    MessageMedia,
    client,
    robotEmoji,
) {
    let textToSpeak = '';
    let voiceId = getRandomVoice();

    if (stringifyMessage.length <= 1) {
        if (message.hasQuotedMsg) {
            textToSpeak = message._data.quotedMsg.body;
        } else {
            return sendReply(
                message,
                'Lo siento, no puedo leer tu mente. Adjunta el texto que quieres que diga.',
                robotEmoji,
            );
        }
    } else {
    // Check if second word in message is a valid voice
        if (stringifyMessage[1].startsWith('-')) {
            let possibleVoiceId =
        stringifyMessage[1].slice(1).charAt(0).toUpperCase() +
        stringifyMessage[1].slice(2).toLowerCase();

            if (Object.prototype.hasOwnProperty.call(voiceOptions, possibleVoiceId)) {
                voiceId = possibleVoiceId;
            } else {
                sendReply(
                    message,
                    'Voz inválida. Utiliza <!help say> para ver las voces disponibles. Usaremos una voz random.',
                    robotEmoji,
                );
            }

            textToSpeak = stringifyMessage
                .slice(2, stringifyMessage.length)
                .join(' '); // start speaking from third word onwards
        } else {
            sendReply(
                message,
                'Ahora puedes escoger entre varias voces. Utiliza <!help say> para ver las voces disponibles. Usaremos una voz random.',
                robotEmoji,
            );
            textToSpeak = stringifyMessage.slice(1).join(' '); // If no voice is specified, start speaking from second word onwards
        }
    }

    if (textToSpeak.length > 1000) {
        return sendReply(
            message,
            'Lo siento, el texto es demasiado largo. Por favor, limita tu mensaje a 1000 caracteres.',
            robotEmoji,
        );
    }

    const songId = uuidv4();
    let filePath;

    try {
        filePath = await synthesizeSpeech(textToSpeak, songId, voiceId);
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(message.id.remote, media, {
            sendAudioAsVoice: true,
        });
    } catch (err) {
        throw new Error(`Failed to handle text to audio: ${err.message}`);
    } finally {
        if (filePath) {
            await fs.promises.unlink(filePath);
        }
    }
}

module.exports = {
    handleTextToAudio,
};
