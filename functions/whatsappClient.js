/* Import */
// Packages
const { Client, LocalAuth, MessageMedia, /*Buttons,*/ List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

// Function Locations
const general = require('../commands/general');
const admin = require('../commands/admin');
const sciHub = require('../commands/sciHub');
const boTeX = require('../commands/boTeX');
const logFunctionCall = require('./logFunctionCall');
const spotifyAPI = require('./spotifyAPI');
const database = require('../database/connectToDatabase');

/* Global Variables */ 
let prefix = '!';
let prefix_admin = '@';
let robotEmoji = '🤖';
let mediaSticker, originalQuotedMessage, song, languageCode, youtubeType;

// User and admin commands
const commands  = {
  help: 'help',
  sticker: 'sticker',
  url: 'url',
  spot: 'spot',
  cae: 'cae',
  fromis: 'fromis',
  w: 'w',
  yt: 'yt',
  play: 'play',
  sh: 'sh',
	lx: 'lx',
	paper: 'paper',
}

const adminCommands = {
	todos: 'todos',
	//ban: 'ban',
};

const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;
const subreddit = general.capitalizeText(fromisCommand); // Subreddit for the command "fromis"

/* Youtube */
// Youtube variables to be passed to yt-dlp
const commandsYoutubeDownload = {
  1: {
    notice: '🤖 Adjunta un enlace de YouTube, no seas tan tímido.',
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
    notice: '🤖 Sintaxis incorrecta.',
    commandMode: null,
  },
};

/* Regex */

// Used when converting external media to stickers. GIFs are not supported because they are not animated stickers
const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.%]+(\.(jpg|jpeg|png|mp4))$/;
const imageOrVideoRegex = /\.(jpg|jpeg|png|mp4)$/i;

// Types of youtube links
const youtubeTypes = {
	videos: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)(\/watch\?v=|\/)([A-Za-z0-9-_]{11}).*$/,
	users: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(user\/|c\/|@)?[A-Za-z0-9-_]+$/,
  channels: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/channel\/[A-Za-z0-9-_]+$/,
  playlists: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/playlist\?list=[A-Za-z0-9-_]+$/,
  search: null,
}

/* whatsapp-web.js components */
// Client instance
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: './node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome', // Path to the Chrome executable on Linux
    // executablePath: './node_modules/puppeteer/.local-chromium/win64-982053/chrome-win/chrome.exe', // Path to the Chrome executable on Windows
  },
});
  
// Generate a QR code for the user to scan with their device
client.on('qr', qr => {
  qrcode.generate(qr, {
    small: true,
  });
});
  
// Handle any authentication failures
client.on('auth_failure', authFailureMessage => {
  console.error('Error de autenticación', authFailureMessage);
})

client.on('ready', () => {
  console.log('Estamos listos, ¡el bot está en linea!');
});

/* Commands */

client.on('message_create', async message => {

  /* Method to get the name and number of a user */
  const contactInfo = await message.getContact();
  const senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined in the contact list, so we use the notifyName
  const senderNumber = message.id.participant || message.id.remote;

  /* Logging all messages received to Supabase */
  database.insertMessage(senderNumber, message.body, message.to);

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */
  /* The functions variable should be generated each time, if not, it will loop through all past messages */
  const functions = {
		//banUser: admin.banUser,
    mentionEveryone: admin.mentionEveryone,
    getHelpMessage: general.getHelpMessage,
    getCAEMessage: general.getCAEMessage,
    convertImageToSticker: general.convertImageToSticker,
    convertUrlImageToSticker: general.convertUrlImageToSticker,
    sendSpotifyAudio: spotifyAPI.sendSpotifyAudio,
    getRedditImage: general.getRedditImage,
    getWikiArticle: general.getWikiArticle,
    getYoutubeInformation: general.getYoutubeInformation,
    searchYoutubeVideo: general.searchYoutubeVideo,
    mp3FromYoutube: general.mp3FromYoutube,
    getSciHubArticle: sciHub.getPdfLink,
		paperKeyword: sciHub.paperKeyword,
		transformLatexToImage: boTeX.transformLatexToImage,
  }

  Object.keys(functions).forEach(functionName => {
    functions[functionName] = logFunctionCall(message, functions[functionName]);
  });

  if (message.body.startsWith(prefix)) {
    /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
    let stringifyMessage = message.body.trim().split(/\s+/);

    const command = stringifyMessage[0].split(prefix)[1];
    if (!(command in commands)) return;

    /* Get all the text after the command (yt & wiki) */
    const query = message.body.split(' ').slice(1).join(' ');

    let chat = await message.getChat();

    switch (command) {
      case commands.help:
        functions.getHelpMessage(prefix, stringifyMessage, helpCommand, message, client, List);
        break;
      case commands.sticker:
        if (!message.hasQuotedMsg && !message.hasMedia) {
          message.reply(`${robotEmoji} Tarao, te olvidaste de adjuntar la imagen.`);
          message.react('⚠️');
          return;
        }

        try {
          if (message.hasQuotedMsg) {
            originalQuotedMessage = await message.getQuotedMessage();
            mediaSticker = await originalQuotedMessage.downloadMedia();
          } else {
            mediaSticker = await message.downloadMedia();
          }
          await functions.convertImageToSticker(chat, message, mediaSticker, senderName, senderNumber);
        } catch (error) {
          console.log(error);
        }
        break;
      case commands.url:
        if (stringifyMessage.length !== 2) {
          message.reply(`${robotEmoji} URL, solo la URL.`);
          message.react('⚠️');
        } else {
          const stickerURL = stringifyMessage[1];
  
          if (!urlRegex.test(stickerURL) || !imageOrVideoRegex.test(stickerURL)) {
            message.reply(`${robotEmoji} URL inválida, por favor verifica y vuelve a enviarlo.`);
            return;
          }
  
          try {
            const response = await fetch(stickerURL);
            const [contentType, contentLength] = (response.headers.get('content-type') || '').split(';');
  
            if (response.ok && contentType && (contentType.startsWith('image/') || contentType.startsWith('video/'))) {
              if (contentType.startsWith('video/mp4') && contentLength && parseInt(contentLength.split('=')[1]) > 20 * 1000) {
                message.reply(`${robotEmoji} Necesitas premium para enviar videos de más de 20 segundos.`);
              } else {
                const sticker = await MessageMedia.fromUrl(stickerURL);
                functions.convertUrlImageToSticker(chat, message, sticker, senderName, senderNumber);
              }
            } else {
              message.reply(`${robotEmoji} Esa URL no es hacia el corazón de ella, ni siquiera es una imagen o video. Intenta de nuevo.`);
            }
          } catch (error) {
            console.error(error);
            message.reply(`${robotEmoji} Parece que algo salió mal, intenta de nuevo.`);
          }
        }
        break;
      case commands.spot:
        song = await spotifyAPI.getSongData(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`);

        if(stringifyMessage.length === 1) {
          message.reply(`${robotEmoji} Cómo te atreves a pedirme una canción sin decirme el nombre.`);
          message.react('⚠️');
        } else {
          const audioDownloaded = await spotifyAPI.downloadSpotifyAudio(song);

					if (audioDownloaded) {
						await functions.sendSpotifyAudio(MessageMedia, client, message, song, robotEmoji);
					} else {
						message.reply(`${robotEmoji} Houston, tenemos un problema. Intenta de nuevo.`);
					}
        }
        break;
      case commands.cae:
        functions.getCAEMessage(prefix, stringifyMessage, caeCommand, message/*, client, Buttons*/);
        break;
      case commands.fromis:
        functions.getRedditImage(message, subreddit, client, MessageMedia);
        break;
      case commands.w:
        languageCode = stringifyMessage[0].substring(3) || 'es';
        if (stringifyMessage.length < 2 || languageCode.length !== 2) {
          message.reply(`${robotEmoji} ${stringifyMessage.length < 2 ? 'Adjunta un enlace o una búsqueda de Wikipedia.' : 'Asegúrate de usar un código de idioma válido de 2 letras.'}`);
          return;
        }
        functions.getWikiArticle(message, query, languageCode, senderName, client, MessageMedia);
        break;
      case commands.yt:
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
          functions.searchYoutubeVideo(message, client, MessageMedia, query);
        } else {
          functions.getYoutubeInformation(message, client, MessageMedia, query, youtubeType);
        }
        break;
			case commands.play: {
				const { notice = '', commandMode } = commandsYoutubeDownload[stringifyMessage.length] || commandsYoutubeDownload.default;
		
				if (notice) {
						message.reply(notice);
						return;
				}
				if (stringifyMessage.length > 2 && (isNaN(Number(stringifyMessage[2])) || (stringifyMessage.length > 3 && isNaN(Number(stringifyMessage[3]))))) {
						message.reply(`${robotEmoji} El formato del comando es incorrecto, los valores deben ser números.`);
						return;
				}
				functions.mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage);
				break;
			}
      case commands.sh:
        if (stringifyMessage.length === 2) {
          functions.getSciHubArticle(message, client, MessageMedia, stringifyMessage);
          return;
        } else {
          message.reply(`${robotEmoji} Adjunta el DOI de la publicación que quieres descargar.`);
        }
        break;
			case commands.lx:
				if (stringifyMessage.length > 1) {
					const query = stringifyMessage.slice(1).join(' ');
					const beginRegex = /\\begin\{[a-z]*\}/g;
					if (beginRegex.test(query)) {
						message.reply(`${robotEmoji} No es necesario usar \\begin{document} ni \\end{document} o similares.`);
					}
					functions.transformLatexToImage(message, client, MessageMedia, query, robotEmoji);
				}
				break;
			case commands.paper:
				if (stringifyMessage.length === 2) {
					functions.paperKeyword(message, stringifyMessage, robotEmoji);
				} else {
					message.reply(`${robotEmoji} ¿De qué tema quieres buscar?`);
				}
				break;
      default:
        message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
        break;
    }

  }

  if (message.body.startsWith(prefix_admin)) {
    const command = message.body.split(prefix_admin)[1];
    if (!(command in adminCommands)) return;
    
    let chat = await message.getChat();
	
		/* Admins only exist on groups */
    if (chat.isGroup) {
			const participantsArray = Object.values(chat.participants);
			const admins = participantsArray.filter(participant => participant.isAdmin);
			const isAdmin = admins.some(admin => admin.id._serialized === senderNumber);

			if (isAdmin) {
				switch (command) {
					case adminCommands.todos:
						functions.mentionEveryone(chat, client, message, senderName);
						break;
					/* https://github.com/pedroslopez/whatsapp-web.js/issues/2067
					case adminCommands.ban:
						const quotedMessage = await message.getQuotedMessage();
						if (quotedMessage) {
							const quotedAuthor = quotedMessage.author;
							functions.banUser(chat, quotedAuthor, message, robotEmoji);
						} else {
							message.reply(`${robotEmoji} Responde a un mensaje para banear a esa persona.`);
						}
						break;
					*/
					default:
						message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
						break;
				}
			} else {
				console.log('you are not admin')
				return message.reply(`${robotEmoji} No tienes permisos para usar este comando.`);
			}
		}

	}

});

module.exports = client;