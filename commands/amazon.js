const AWS = require('aws-sdk')
const fs = require('fs').promises;
const path = require('path')

AWS.config.update({region: 'us-east-1'})

const Polly = new AWS.Polly({apiVersion: '2016-06-10'})

async function synthesizeSpeech(text, songId) {
	let params = {
		'Text': text,
		'OutputFormat': 'mp3',
		'VoiceId': 'Ricardo',
	}

	try {
		const data = await Polly.synthesizeSpeech(params).promise();
		
		if (data && data.AudioStream instanceof Buffer) {
			const filePath = path.join(__dirname, `../audio/${songId}.mp3`);
			await fs.writeFile(filePath, data.AudioStream, 'binary');
			return filePath;
		}
	} catch (err) {
		throw err.code;
	}
}

async function handleTextToAudio(stringifyMessage, message, MessageMedia, client, robotEmoji) {
	if (stringifyMessage.length === 1) {
		message.reply(`${robotEmoji} Lo siento, no puedo leer tu mente. Adjunta el texto que quieres que diga.`);
	} else {
		const textToSpeak = stringifyMessage.slice(1).join(' ');

		if (textToSpeak.length > 1000) {
			return message.reply(`${robotEmoji} Lo siento, el texto es demasiado largo. Por favor, limita tu mensaje a 1000 caracteres.`);
		}

		const songId = Math.floor(Math.random() * 1000000);

		try {
			const filePath = await synthesizeSpeech(textToSpeak, songId)
			const media = MessageMedia.fromFilePath(filePath);
			await client.sendMessage(message.id.remote, media, { sendAudioAsVoice: true });
			await fs.unlink(filePath);
		} catch (err) {
			console.error(err);
		}
	}
}

module.exports = {
	handleTextToAudio,
};