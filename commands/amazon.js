const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
const fs = require("fs");
const path = require("path");

const REGION = "us-east-1";
const client = new PollyClient({ region: REGION });

async function synthesizeSpeech(text, songId) {
  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Ricardo',
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
    console.error(err);
    throw err;
  }
}

async function sendReply(message, replyText, robotEmoji) {
  return message.reply(`${robotEmoji} ${replyText}`);
}

async function handleTextToAudio(stringifyMessage, message, MessageMedia, client, robotEmoji) {
  let textToSpeak = '';

  if (stringifyMessage.length <= 1) {
    if (message.hasQuotedMsg) {
      textToSpeak = message._data.quotedMsg.body;
    } else {
      return sendReply(message, 'Lo siento, no puedo leer tu mente. Adjunta el texto que quieres que diga.', robotEmoji);
    }
  } else {
    textToSpeak = stringifyMessage.slice(1).join(' ');
  }

  if (textToSpeak.length > 1000) {
    return sendReply(message, 'Lo siento, el texto es demasiado largo. Por favor, limita tu mensaje a 1000 caracteres.', robotEmoji);
  }

  const songId = Math.floor(Math.random() * 1000000);
  let filePath;

  try {
    filePath = await synthesizeSpeech(textToSpeak, songId)
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(message.id.remote, media, { sendAudioAsVoice: true });
  } catch (err) {
    console.error(err);
  } finally {
    if(filePath) {
      await fs.promises.unlink(filePath);
    }
  }
}

module.exports = {
  handleTextToAudio,
};
