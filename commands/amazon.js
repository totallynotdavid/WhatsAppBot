const AWS = require('aws-sdk')
const fs = require('fs')
const path = require('path')

AWS.config.update({region: 'us-east-1'})

const Polly = new AWS.Polly({apiVersion: '2016-06-10'})

async function synthesizeSpeech(text, songId) {
	return new Promise((resolve, reject) => {
		let params = {
			'Text': text,
			'OutputFormat': 'mp3',
			'VoiceId': 'Ricardo',
		}

		Polly.synthesizeSpeech(params, (err, data) => {
			if (err) {
				reject(err.code)
			} else if (data) {
				if (data.AudioStream instanceof Buffer) {
					const filePath = path.join(__dirname, `../audio/${songId}.mp3`);
					fs.writeFile(filePath, data.AudioStream, 'binary', err => {
						if (err) {
							reject(err)
						} else {
							resolve(filePath);
						}
					})
				}
			}
		})
	});
}

module.exports = {
	synthesizeSpeech,
};