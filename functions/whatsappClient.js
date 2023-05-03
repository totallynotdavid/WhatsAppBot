/* Import */
const { Client, LocalAuth, MessageMedia /*, Buttons, List */ } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;

const { general, admin, sciHub, boTeX } = require('../commands/index.js');
const logFunctionCall = require('./logFunctionCall');
const spotifyAPI = require('../lib/api/spotifyUtils.js');
const driveAPI = require('../lib/api/gdrive.js');
const database = require('../lib/api/supabaseCommunicationModule.js');
const { monitorFacebookPage } = require('./checkNewPosts');
const newFunctions = require('../lib/functions/index.js');

/* Global Variables */ 
let { prefix, prefix_admin, robotEmoji, mediaSticker, originalQuotedMessage, song, languageCode, youtubeType, paidUsers, physicsUsers, premiumGroups, commandsYoutubeDownload, commands, adminCommands } = require('./globals');
const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;
const subreddit = general.capitalizeText(fromisCommand); // Subreddit for the command "fromis"
const setFetchedData = (fetchedPaidUsers, fetchedPhysicsUsers, fetchedPremiumGroups) => {
  paidUsers = fetchedPaidUsers;
  physicsUsers = fetchedPhysicsUsers;
  premiumGroups = fetchedPremiumGroups;
};

// Regex
const { urlRegex, imageOrVideoRegex, websiteAllowedRegex, youtubeTypes } = require('./regex');

/* whatsapp-web.js components */
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: newFunctions.launchPuppeteer(),
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
	newFunctions.starter.setBotStatus(client);
	monitorFacebookPage(client, 10000);
});

function isPremiumGroup(groupId) {
  return premiumGroups.includes(groupId);
}

/* Commands */

client.on('message_create', async message => {

  /* Method to get the name and number of a user */
  const contactInfo = await message.getContact();
  const senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined in the contact list, so we use the notifyName
  const senderNumber = message.id.participant || message.id.remote;

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */
  /* The functions variable should be generated each time, if not, it will loop through all past messages */
  const functions = {
		banUser: admin.banUser,
    mentionEveryone: admin.mentionEveryone,
		transformLatexToImage: boTeX.transformLatexToImage,
		getDocumentsFromGoogleDrive: driveAPI.searchFolderCache,
		downloadFilesFromGoogleDrive: driveAPI.downloadFilesFromGoogleDrive,
    getHelpMessage: general.getHelpMessage,
    getCAEMessage: general.getCAEMessage,
    convertImageToSticker: general.convertImageToSticker,
		validateAndConvertMedia: general.validateAndConvertMedia,
    getRedditImage: general.getRedditImage,
    getWikiArticle: general.getWikiArticle,
    getYoutubeInformation: general.getYoutubeInformation,
    searchYoutubeVideo: general.searchYoutubeVideo,
    mp3FromYoutube: general.mp3FromYoutube,
    getSciHubArticle: sciHub.getPdfLink,
		paperKeyword: sciHub.paperKeyword,
		getAuthorInfo: sciHub.authorRecentPapers,
		sendSpotifyAudio: spotifyAPI.sendSpotifyAudio,
  }

  Object.keys(functions).forEach(functionName => {
    functions[functionName] = logFunctionCall(message, functions[functionName]);
  });

  if (message.body.startsWith(prefix)) {
    /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
    let stringifyMessage = message.body.trim().split(/\s+/);

    const command = stringifyMessage[0].split(prefix)[1];
		let chat = await message.getChat();
		if (!chat.isGroup) return;
		if (!isPremiumGroup(chat.id._serialized)) return;

		/* Logging all messages received to Supabase */
		database.insertMessage(senderNumber, message.body, message.to);

    if (!(command in commands)) return;

    /* Get all the text after the command (yt & wiki) */
    const query = message.body.split(' ').slice(1).join(' ');

    switch (command) {
      case commands.help:
        functions.getHelpMessage(prefix, stringifyMessage, helpCommand, message, /*client, List,*/ robotEmoji);
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
				/*
				Test case:
				Youtube: https://www.reddit.com/r/neverchangejapan/comments/12spx82/ningen_isu_ringo_no_namida_a_metal_song_about_an/
				Imagen: https://www.reddit.com/r/unixporn/comments/12ruaq1/xperia_10_iii_w_sailfish_w_arch_my_mobile_office/
				Video: https://www.reddit.com/r/blackmagicfuckery/comments/12sex2d/pool_black_magic/
				*/
        if (stringifyMessage.length !== 2) {
					message.reply(`${robotEmoji} URL, solo la URL.`);
					message.react('⚠️');
				} else {
					let stickerURL = stringifyMessage[1];

					if (!(websiteAllowedRegex.test(stickerURL) || (urlRegex.test(stickerURL) || imageOrVideoRegex.test(stickerURL)))) {
						message.reply(`${robotEmoji} URL inválida, por favor verifica y vuelve a enviarlo. Solo se aceptan imágenes y videos.`);
						return;
					}

					stickerURL = stickerURL.replace(/\.gifv$/i, '.mp4'); // Fix for Imgur links

					let mediaURL;

					if (stickerURL.includes('reddit.com')) {
						const { mediaURL: redditMediaURL, media } = await general.handleRedditMedia(stickerURL, message, robotEmoji);
						if (!redditMediaURL) {
							return;
						}
						mediaURL = redditMediaURL;
						
						if (media.is_video) { // check if the media is a video
							const localFilePath = await general.saveRedditVideo(media);
							await functions.validateAndConvertMedia(chat, mediaURL, message, MessageMedia, senderName, senderNumber, robotEmoji, localFilePath);
						} else {
							await functions.validateAndConvertMedia(chat, mediaURL, message, MessageMedia, senderName, senderNumber, robotEmoji);
						}
					} else {
						mediaURL = stickerURL;
						await functions.validateAndConvertMedia(chat, mediaURL, message, MessageMedia, senderName, senderNumber, robotEmoji);
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
				if (!paidUsers.includes(senderNumber)) {
					return message.reply(`${robotEmoji} Deshabilitado. Este comando solo estará disponible para usuarios premium.`);
				}

				const { notice = '', commandMode } = commandsYoutubeDownload[stringifyMessage.length] || commandsYoutubeDownload.default;
		
				if (notice) {
						message.reply(notice);
						return;
				}
				if (stringifyMessage.length > 2 && (isNaN(Number(stringifyMessage[2])) || (stringifyMessage.length > 3 && isNaN(Number(stringifyMessage[3]))))) {
						message.reply(`${robotEmoji} El formato del comando es incorrecto, los valores deben ser números.`);
						return;
				}
				functions.mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage, robotEmoji);
				break;
			}
      case commands.doi:
        if (stringifyMessage.length === 2) {
          functions.getSciHubArticle(message, client, MessageMedia, stringifyMessage, robotEmoji);
          return;
        } else {
          message.reply(`${robotEmoji} Adjunta el DOI de la publicación que quieres descargar.`);
        }
        break;
			case commands.tex:
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
				if (stringifyMessage.length >= 2) {
					functions.paperKeyword(message, query, robotEmoji);
				} else {
					message.reply(`${robotEmoji} ¿De qué tema quieres buscar?`);
				}
				break;
			case commands.author:
				if (stringifyMessage.length >= 2) {
					functions.getAuthorInfo(message, query, robotEmoji);
				} else {
					message.reply(`${robotEmoji} ¿De qué autor quieres buscar?`);
				}
				break;
			case commands.doc:
				if (!physicsUsers.includes(senderNumber)) {
					return message.reply(`${robotEmoji} Necesitas ser un estudiante verificado de la FCF.`);
				}
				if (stringifyMessage.length >= 2) {
					functions.getDocumentsFromGoogleDrive(query)
						.then((results) => {
								if (results && results.length > 0) {
										let messageText = `${robotEmoji} Resultados:\n\n`;
										const limit = Math.min(5, results.length);
										for (let i = 0; i < limit; i++) {
												const file = results[i];
												messageText += `${i+1}. ${file.name} (${file.webViewLink})\n`;
										}
										message.reply(messageText);
								} else {
										message.reply(`${robotEmoji} No se encontraron resultados.`);
								}
						})
						.catch((error) => {
								console.error('Error searching folder cache:', error);
						});
				} else {
					message.reply(`${robotEmoji} Ya, pero, ¿de qué quieres buscar?`);
				}
				break;
			case commands.drive:
				/*
				if (!physicsUsers.includes(senderNumber)) {
					return message.reply(`${robotEmoji} Necesitas ser un estudiante verificado de la FCF.`);
				}
				*/
				if (stringifyMessage.length === 2) {
					try {
						const filePath = await functions.downloadFilesFromGoogleDrive(query);
						const maxSize = 200 * 1024 * 1024;
						const fileStats = await fs.stat(filePath);
				
						if (fileStats.size > maxSize) {
							await fs.promises.unlink(filePath);
							return message.reply(`${robotEmoji} El archivo es demasiado grande. El tamaño máximo es de 200 MB.`);
						}

						const media = await MessageMedia.fromFilePath(filePath);
						await client.sendMessage(message.id.remote, media, {
							caption: 'PDF file',
						});
				
						await fs.unlink(filePath);
					} catch (error) {
						console.error('Error sending file:', error);
						message.reply(`${robotEmoji} ¿Seguro de que ese archivo existe?`);
					}
				} else {
					message.reply(`${robotEmoji} Ya, pero, ¿de qué quieres descargar?`);
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
				const quotedMessage = await message.getQuotedMessage();
				switch (command) {
					case adminCommands.todos:
						functions.mentionEveryone(chat, client, message, senderName);
						break;
					case adminCommands.ban:
						if (!paidUsers.includes(senderNumber)) {
							return message.reply(`${robotEmoji} Deshabilitado. Este comando solo estará disponible para usuarios premium.`);
						}

						if (quotedMessage) {
							const quotedAuthor = quotedMessage.author;

							if (quotedAuthor === `${client.info.wid.user}:8@c.us`) {
								return message.reply(`${robotEmoji} Cómo te atreves.`);
							}
							functions.banUser(chat, quotedAuthor, message, robotEmoji);
						} else {
							message.reply(`${robotEmoji} Responde a un mensaje para banear a esa persona.`);
						}
						break;
					case adminCommands.id:
						if (!paidUsers.includes(senderNumber)) {
							return message.reply(`${robotEmoji} Deshabilitado. Este comando solo estará disponible para usuarios premium.`);
						}
						message.reply(`${robotEmoji} El ID de este chat es ${chat.id._serialized}.`);
						break;
					default:
						message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
						break;
				}
			} else {
				return message.reply(`${robotEmoji} No tienes permisos para usar este comando.`);
			}
		} else {
			return
		}

	}

});

module.exports = {
	client,
	setFetchedData,
}