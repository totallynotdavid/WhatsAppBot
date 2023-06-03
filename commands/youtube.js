const { mp3FromYoutube, searchYoutubeVideo, getYoutubeInformation } = require('./general');
const { robotEmoji } = require('../functions/globals');	
const { youtubeTypes } = require('../functions/regex');
let youtubeType;

const commandsYoutubeDownload = {
  1: {
    notice: `${robotEmoji} Adjunta un enlace de YouTube, no seas tan tímido.`,
    commandMode: null,
  },
  2: {
    commandMode: 'fullVideo',
  },
  3: {
    commandMode: 'cutAtStart',
  },
  4: {
    commandMode: 'cutVideo',
  },
  default: {
    notice: `${robotEmoji} Sintaxis incorrecta. Solo envía el comando y el enlace de YouTube.`,
    commandMode: null,
  },
};

function handleYoutubeAudio(stringifyMessage, message, client, MessageMedia, robotEmoji) {
	const { notice = '', commandMode } = commandsYoutubeDownload[stringifyMessage.length] || commandsYoutubeDownload.default;
		
	if (notice) {
		message.reply(notice);
		return;
	}
	if (stringifyMessage.length > 2 && (isNaN(Number(stringifyMessage[2])) || (stringifyMessage.length > 3 && isNaN(Number(stringifyMessage[3]))))) {
		message.reply(`${robotEmoji} El formato del comando es incorrecto, los valores deben ser números.`);
		return;
	}
	mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage, robotEmoji);
}

function handleYoutubeSearch(stringifyMessage, message, client, MessageMedia, query, robotEmoji) {
	if (stringifyMessage.length < 2) {
		message.reply(`${robotEmoji} Adjunta un enlace o una búsqueda de YouTube, no seas tan tímido.`);
		return;
	}

	youtubeType = 'search';
	for (const key in youtubeTypes) {
		if (youtubeTypes[key] && query.match(youtubeTypes[key])) {
			youtubeType = key;
			break;
		}
	}
	
	if (youtubeType === 'search') {
		searchYoutubeVideo(message, client, MessageMedia, query);
	} else {
		getYoutubeInformation(message, client, MessageMedia, query, youtubeType);
	}
}

module.exports = {
	handleYoutubeAudio,
	handleYoutubeSearch,
};