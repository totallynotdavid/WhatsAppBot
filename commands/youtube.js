const { mp3FromYoutube, searchYoutubeVideo, getYoutubeInformation } = require('./general');
const { robotEmoji } = require('../functions/globals');  
const { youtubeTypes } = require('../functions/regex');
let youtubeType;

const WARNING = 'warning';
const FOUND = 'found';

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

async function handleYoutubeSearch(stringifyMessage, message, client, MessageMedia, query, robotEmoji) {
  try {
    if (stringifyMessage.length < 2) {
      return [{
        type: WARNING,
        message: `${robotEmoji} Adjunta un enlace o una búsqueda de YouTube, no seas tan tímido.`,
      }]
    }

    youtubeType = 'search';
    for (const key in youtubeTypes) {
      if (youtubeTypes[key] && query.match(youtubeTypes[key])) {
        youtubeType = key;
        break;
      }
    }
  
    if (youtubeType === 'search') {
      const [ media, captionText, link, title, warningMessage ] = await searchYoutubeVideo(message, client, MessageMedia, query);
      if (warningMessage) {
        return [{
          type: WARNING,
          message: warningMessage,
        }]
      }
  
      return [{
        type: FOUND,
        message: captionText,
        media: media,
        title: title,
        link: link,
      }];
    } else {
      const [ media, captionMediaYoutube, link ] = await getYoutubeInformation(message, client, MessageMedia, query, youtubeType);
      return [{
        type: FOUND,
        message: captionMediaYoutube,
        media: media,
        link: link,
      }];
    }
  } catch (error) {
    console.error(`Error in handleYoutubeSearch: ${error.message}`);
    throw error;
  }
}

async function handleCommand(stringifyMessage, message, client, MessageMedia, query, robotEmoji, handleAudio = false) {
  try {
    if (!Array.isArray(stringifyMessage) || stringifyMessage.length < 1) {
      throw new Error('Invalid input format for stringifyMessage.');
    }

    const result = await handleYoutubeSearch(stringifyMessage, message, client, MessageMedia, query, robotEmoji);

    if (result.length === 0) {
      throw new Error(`${robotEmoji} Houston, tenemos un problema. No se pudo encontrar el video.`);
    }
  
    const resultObj = result[0];
  
    switch (resultObj.type) {
      case WARNING:
        message.reply(`${robotEmoji} ${resultObj.message}`);
        break;
      case FOUND:
        if (handleAudio) {
          const stringifyBuild = [ 'play', resultObj.link ];
          handleYoutubeAudio(stringifyBuild, message, client, MessageMedia, robotEmoji);
          message.reply(`${robotEmoji} El video que encontramos es: *${resultObj.title}*`);
        } else {
          try {
            client.sendMessage(message.id.remote, resultObj.media, {
              caption: resultObj.message,
            });
          } catch (sendError) {
            console.error(`Failed to send message: ${sendError.message}`);
            message.reply(`${robotEmoji} Houston, tenemos un problema.`);
          }
        }
        break;
      default:
        throw new Error(`${robotEmoji} Houston, tenemos un problema. No se pudo encontrar el video.`);
    }
  } catch (error) {
    console.error(`Error in handleCommand: ${error.message}`);
    message.reply(`${robotEmoji} Hubo un problema al procesar el comando.`);
  }
}

module.exports = {
  handleYoutubeAudio,
  handleYoutubeSearch,
  handleCommand,
};