// Packages
const { Client, LocalAuth, MessageMedia /*, Buttons, List */ } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;

// Import commands and utility functions
const { general, admin, sciHub, boTeX, lyrics, amazon, help, cae, bot, group, openai, wikipedia, reddit, utilities } = require('../commands/index.js');
const newFunctions = require('../lib/functions/index.js');

// Import APIs
const { spotifyUtils, gdrive, supabaseCommunicationModule } = require('../lib/api/index.js');

// Import logging utility
const logFunctionCall = require('./logFunctionCall');

// Import logging utility
let { 
	prefix, prefix_admin, robotEmoji,
	mediaSticker, originalQuotedMessage, song,
	languageCode, youtubeType,
	paidUsers, physicsUsers, premiumGroups, 
	commandsYoutubeDownload, commands, adminCommands,
} = require('./globals');

// Import specific commands
const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;
// Set subreddit for the "fromis" command
const subreddit = utilities.capitalizeText(fromisCommand);

// Set function to update premium groups and users
const setFetchedData = (fetchedPaidUsers, fetchedPhysicsUsers, fetchedPremiumGroups) => {
  paidUsers = fetchedPaidUsers;
  physicsUsers = fetchedPhysicsUsers;
  premiumGroups = fetchedPremiumGroups;
};

// Update data when called
let refreshDataCallback;
const setRefreshDataCallback = (callback) => {
  refreshDataCallback = callback;
};

// Import regular expressions
const { 
	urlRegex, 
	imageOrVideoRegex, 
	websiteAllowedRegex, 
	youtubeTypes,
} = require('./regex');
// const { MessengerDestinationPageWelcomeMessage } = require('facebook-nodejs-business-sdk');

/* 
	WhatsApp components 
*/
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

// Bot is ready and connected to WhatsApp
client.on('ready', () => {
  console.log('Estamos listos, ¡el bot está en linea!');

	// Function starter to check for new posts in the Facebook page
	// newFunctions.facebookMonitor.monitorFacebookPage(client, 10000);

	/* For some reason, this only works sometimes
	// Check uptime
	newFunctions.starter.setBotStatus(client);
	setInterval(() => {
		newFunctions.starter.setBotStatus(client);
		console.log('Bot status updated');
	}, 300000);
	*/
});

/* Commands */

client.on('message_create', async message => {

  /* Method to get the name and number of a user */
  const contactInfo = await message.getContact();
  const senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined, so we use the notifyName
  const senderNumber = message.id.participant || message.id.remote;

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */
  /* The functions variable should be generated each time, if not, it will loop through all past messages */
  const functions = {
		banMultipleUsers: admin.banMultipleUsers,
    mentionEveryone: admin.mentionEveryone,
		enableBot: bot.enableBot,
		disableBot: bot.disableBot,
		transformLatexToImage: boTeX.transformLatexToImage,
		getDocumentsFromGoogleDrive: gdrive.searchFolderDatabase,
		downloadFilesFromGoogleDrive: gdrive.downloadFilesFromGoogleDrive,
		refreshDatabase: gdrive.refreshDatabase,
    getHelpMessage: help.getHelpMessage,
		getAdminHelpMessage: help.getAdminHelpMessage,
    getCAEMessage: cae.getCAEMessage,
    convertImageToSticker: general.convertImageToSticker,
		validateAndConvertMedia: general.validateAndConvertMedia,
    getRedditImage: reddit.getRedditImage,
    getWikiArticle: wikipedia.getWikiArticle,
    getYoutubeInformation: general.getYoutubeInformation,
    searchYoutubeVideo: general.searchYoutubeVideo,
    mp3FromYoutube: general.mp3FromYoutube,
		processUser: group.processUser,
    getSciHubArticle: sciHub.getPdfLink,
		paperKeyword: sciHub.paperKeyword,
		getAuthorInfo: sciHub.authorRecentPapers,
		sendSpotifyAudio: spotifyUtils.sendSpotifyAudio,
		fetchSongLyrics: lyrics.fetchSongLyrics,
		synthesizeSpeech: amazon.synthesizeSpeech,
		generateText: openai.generateText,
  }

  Object.keys(functions).forEach(functionName => {
    functions[functionName] = logFunctionCall(message, functions[functionName]);
  });

	/*
	The checks are done in order of importance
	1. Check if the message is in a group
	Here there is a divergence between the admin and the regular commands
	1.a Regular: The message is in a premium group
	1.b Admin: The message is from a user who is an paid user
	*/

	let chat = await message.getChat();
	if (!chat.isGroup) return;

  if (message.body.startsWith(prefix)) {
		if (!premiumGroups.some(group => group.group_id === chat.id._serialized && group.isActive)) return message.reply(`${robotEmoji} Lo siento, este grupo no está registrado. Para más información, contacta a David.`);

    /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
    let stringifyMessage = message.body.trim().split(/\s+/);

    const command = stringifyMessage[0].split(prefix)[1];

		/* Logging all messages received to Supabase */
		// supabaseCommunicationModule.insertMessage(senderNumber, message.body, message.to);

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
			case commands.toimage:
				if (stringifyMessage.length === 1 && message._data.quotedMsg.type === 'sticker') {
					originalQuotedMessage = await message.getQuotedMessage();
					mediaSticker = await originalQuotedMessage.downloadMedia();
					await chat.sendMessage(mediaSticker, { sendMediaAsSticker: false, caption: `${robotEmoji} Solicitado por ${senderName}.` });
				} else {
					message.reply(`${robotEmoji} Contesta a un mensaje con un sticker. Solo usa el comando, no añadas nada más.`);
					message.react('⚠️');
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
						const { mediaURL: redditMediaURL, media } = await reddit.handleRedditMedia(stickerURL, message, robotEmoji);
						if (!redditMediaURL) {
							return;
						}
						mediaURL = redditMediaURL;
						
						if (media.is_video) { // check if the media is a video
							const localFilePath = await reddit.saveRedditVideo(media);
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
        song = await spotifyUtils.getSongData(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`);

        if(stringifyMessage.length === 1) {
          message.reply(`${robotEmoji} Cómo te atreves a pedirme una canción sin decirme el nombre.`);
          message.react('⚠️');
        } else {
          const audioDownloaded = await spotifyUtils.downloadSpotifyAudio(song);

					if (audioDownloaded) {
						await functions.sendSpotifyAudio(MessageMedia, client, message, song, robotEmoji);
					} else {
						message.reply(`${robotEmoji} Houston, tenemos un problema. Intenta de nuevo.`);
					}
        }
        break;
			case commands.letra:
				if (stringifyMessage.length === 1) {
					message.reply(`${robotEmoji} Cómo te atreves a pedirme la letra de una canción sin decirme el nombre.`);
					message.react('⚠️');
				} else {
					const songName = stringifyMessage.slice(1).join(' ');
					const songLyrics = await functions.fetchSongLyrics(songName);
					if (songLyrics) {
						message.reply(songLyrics);
					} else {
						message.reply(`${robotEmoji} No encontré la letra de esa canción.`);
					}
				}
				break;
      case commands.cae:
        functions.getCAEMessage(prefix, stringifyMessage, caeCommand, message/*, client, Buttons*/, robotEmoji);
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
				/*
				if (!paidUsers.some(user => user.phone_number === senderNumber)) {
					return message.reply(`${robotEmoji} Deshabilitado. Este comando solo está disponible para usuarios premium.`);
				}
				*/

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
			case commands.say:
				if (stringifyMessage.length === 1) {
					message.reply(`${robotEmoji} Lo siento, no puedo leer tu mente. Adjunta el texto que quieres que diga.`);
				} else {
					const textToSpeak = stringifyMessage.slice(1).join(' ');
					
					if (textToSpeak.length > 1000) {
						message.reply(`${robotEmoji} Lo siento, el texto es demasiado largo. Por favor, limita tu mensaje a 1000 caracteres.`);
						break;
					}

					/*
					if (!/^[a-zA-Z0-9\s]*$/.test(textToSpeak)) {
						message.reply(`${robotEmoji} Lo siento, sólo se permiten letras normales y números en el texto.`);
						break;
					}
					*/
					
					const songId = Math.floor(Math.random() * 1000000);

					functions.synthesizeSpeech(textToSpeak, songId)
						.then(filePath => {
							const media = MessageMedia.fromFilePath(filePath);
							client.sendMessage(message.id.remote, media, { sendAudioAsVoice: true })
								.then(() => fs.unlink(filePath))
								.catch(console.error);
						})
						.catch(console.error);
				}
				break;
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
				switch (stringifyMessage.length) {
					case 2:
						try {
							const filePath = await functions.downloadFilesFromGoogleDrive(query);
							const maxSize = 200 * 1024 * 1024;
							const fileStats = await fs.stat(filePath);
					
							if (fileStats.size > maxSize) {
								await fs.unlink(filePath);
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
						break;
					case 1:
						message.reply(`${robotEmoji} Ya, pero, ¿de qué quieres descargar?`);
						break;
					default:
						message.reply(`${robotEmoji} Envía solo un enlace de Google Drive.`);
				}
				break;
      default:
        // message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
        break;
    }

  }

  if (message.body.startsWith(prefix_admin)) {
		/*
		The logic here is the following:
		1. Check if string[1] is an actual command, this must be done because the user could send a message starting with the prefix but not being a command
		2. Check if the user is a paid user
		*/

		let stringifyMessage = message.body.trim().split(/\s+/);
    const command = stringifyMessage[0].split(prefix_admin)[1];
    if (!(command in adminCommands)) return;

		if (!paidUsers.some(user => user.phone_number === senderNumber)) {
			return message.reply(`${robotEmoji} Deshabilitado. Este comando solo está disponible para usuarios premium.`);
		}

		/* Check if the sender is an admin */
    const participantsArray = Object.values(chat.participants);
		const admins = participantsArray.filter(participant => participant.isAdmin);
		// const isAdmin = admins.some(admin => admin.id._serialized === senderNumber);

		// if (isAdmin) {
		const quotedMessage = await message.getQuotedMessage();
		const ownerNumber = client.info.wid.user;
		switch (command) {
			case adminCommands.help:
				functions.getAdminHelpMessage(prefix_admin, stringifyMessage, helpCommand, message, /*client, List,*/ robotEmoji);
				break;
			case adminCommands.todos:
				functions.mentionEveryone(chat, client, message, senderName);
				break;
			case adminCommands.ban:
				if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
					return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
				}

				if (quotedMessage && stringifyMessage.length === 1) {
					const quotedAuthor = quotedMessage.author;
					if (quotedAuthor === `${client.info.wid.user}:8@c.us`) {
						message.reply(`${robotEmoji} Cómo te atreves.`);
					} else {
						functions.banMultipleUsers(client, chat, [quotedAuthor], message, robotEmoji);
					}
				} else if (stringifyMessage.length > 1) {
					functions.banMultipleUsers(client, chat, message.mentionedIds, message, robotEmoji);
				} else {
					message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para eliminarlo del grupo.`);
				}
				break;
			case adminCommands.bot:
				if (stringifyMessage.length === 2) {
					const botCommand = stringifyMessage[1];

					switch (botCommand) {
						case 'on':
							await functions.enableBot(message, chat.id._serialized, robotEmoji);
							await refreshDataCallback();
							break;
						case 'off':
							await functions.disableBot(message, chat.id._serialized, robotEmoji);
							await refreshDataCallback();
							break;
						default:
							message.reply(`${robotEmoji} Solo puedes habilitar o deshabilitar el bot.`);
							break;
					}
				} else {
					message.reply(`${robotEmoji} ¿Y qué quieres que haga?`);
				}
				break;
			case adminCommands.del:
				if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
					return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
				}

				if (quotedMessage && stringifyMessage.length === 1) {
					const quotedAuthor = quotedMessage.author;
					if (quotedAuthor === `${client.info.wid.user}:8@c.us`) {
						message.reply(`${robotEmoji} Cómo te atreves.`);
					}
					await quotedMessage.delete(true);
				} else {
					message.reply(`${robotEmoji} Responde a un mensaje para eliminarlo.`);
				}
				break;
			case adminCommands.join:
				if (stringifyMessage.length === 2) {
					const inviteLink = stringifyMessage[1];
					const inviteCode = inviteLink.split('https://chat.whatsapp.com/')[1];
					try {
						await client.acceptInvite(inviteCode);
						message.reply(`${robotEmoji} ¡Unido!`);
					} catch (error) {
						message.reply(`${robotEmoji} No se pudo unir. ¿Está el enlace correcto?`);
					}
				} else {
					message.reply(`${robotEmoji} Envía el enlace de invitación del grupo.`);
				}
				break;
			case adminCommands.addgroup:
				if (!chat.id || !chat.name) return message.reply(`${robotEmoji} Una de las variables es undefined.`);

				if (stringifyMessage.length === 1) {
					try {
						await supabaseCommunicationModule.addPremiumGroup(chat.id._serialized, chat.name, senderNumber);
						await refreshDataCallback();
						message.reply(`${robotEmoji} Chat registrado.`);
					} catch (error) {
						message.reply(`${robotEmoji} Error registrando el chat: ${error.message}`);
					}
				} else {
					message.reply(`${robotEmoji} Solo envía el comando.`);
				}
				break;
			case adminCommands.addpremium:
				if (senderNumber !== `${ownerNumber}@c.us`) {
					return message.reply(`${robotEmoji} Este comando solo está disponible para el propietario.`);
				}
			
				const isValidNumber = (numStr) => {
					const num = Number(numStr);
					if (!Number.isInteger(num)) {
						throw new Error('Invalid number');
					}
					return num;
				};
			
				const handleAddUser = async (userId, customerName, days) => {
					console.log(`Adding user ${userId} for ${days} days at ${new Date().toISOString()}`)
					try {
						await supabaseCommunicationModule.addPremiumUser(userId, customerName, days);
						message.reply(`${robotEmoji} Se han añadido ${days} días de premium a ${customerName}.`);
					} catch (error) {
						console.error(`Error adding user at ${new Date().toISOString()}: ${error.message}`);
						message.reply(`${robotEmoji} Error añadiendo el usuario.`);
					}
				};
			
				try {
					if (quotedMessage && stringifyMessage.length === 3) {
						const days = isValidNumber(stringifyMessage[2]);
						const customerName = stringifyMessage[1];
						handleAddUser(quotedMessage.author, customerName, days);
					} else if (stringifyMessage.length === 4 && message.mentionedIds.length === 1) {
						const days = isValidNumber(stringifyMessage[3]);
						const customerName = stringifyMessage[2];
						handleAddUser(message.mentionedIds[0], customerName, days);
					} else {
						message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para obtener su ID. Recuerda que el comando es:\n\n${prefix_admin}addpremium <nombre> <días>\n\no\n\n${prefix_admin}addpremium <mencion> <nombre> <días>.`);
					}
				} catch (error) {
					console.error(`Error handling add user command at ${new Date().toISOString()}: ${error.message}`);
					message.reply(`${robotEmoji} Por favor, proporciona un número válido de días.`);
				}
				break;
			case adminCommands.refresh:					
				if (senderNumber !== `${ownerNumber}@c.us`) {
					return message.reply(`${robotEmoji} Este comando solo está disponible para el propietario.`);
				}

				if (stringifyMessage[1] === 'users') {
					await refreshDataCallback();
					message.reply(`${robotEmoji} Genial, se han actualizado manualmente los usuarios.`);
				} else if (stringifyMessage[1] === 'db') {
					message.reply(`${robotEmoji} Actualizando datos... Este proceso puede tardar unos 3 minutos.`);
					try {
						const refreshMessage = await functions.refreshDatabase();
						message.reply(refreshMessage);
					} catch (error) {
						message.reply(`${robotEmoji} Error actualizando la base de datos: ${error.message}`);
					}
				} else {
					message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
				}
				break;
			case adminCommands.promote:
				if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
					return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
				}

				if (stringifyMessage.length === 1 && quotedMessage) {
					functions.processUser(quotedMessage.author, (userId) => !admins.some(admin => admin.id._serialized === userId), 'promoteParticipants', 'Se ha añadido', 'Este usuario ya es administrador.');
				} else if (stringifyMessage.length > 1 && message.mentionedIds && !quotedMessage) {
					functions.processUser(message.mentionedIds, (userId) => !admins.some(admin => admin.id._serialized === userId), 'promoteParticipants', 'Se han añadido', 'Todos los usuarios mencionados ya son administradores.', chat, message, robotEmoji);
				} else {
					message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para hacerle admin.`);
				}
				break;
			case adminCommands.demote:
				if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
					return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
				}

				if (stringifyMessage.length === 1 && quotedMessage) {
					functions.processUser(quotedMessage.author, (userId) => admins.some(admin => admin.id._serialized === userId), 'demoteParticipants', 'Se ha eliminado', 'Este usuario no es administrador.');
				} else if (stringifyMessage.length > 1 && message.mentionedIds && !quotedMessage) {
					functions.processUser(message.mentionedIds, (userId) => admins.some(admin => admin.id._serialized === userId), 'demoteParticipants', 'Se han eliminado', 'Ninguno de los usuarios mencionados es administrador.', chat, message, robotEmoji);
				} else {
					message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para quitarle el admin.`);
				}
				break;
			case adminCommands.chat:
				if (stringifyMessage.length === 1) {
					message.reply(`${robotEmoji} ¿De qué quieres hablar hoy?`);
				} else {
					const chatMessage = stringifyMessage.slice(1).join(' ');
					const chatResponse = await functions.generateText(chatMessage);
					message.reply(`${robotEmoji} ${chatResponse}`);
				}
				break;
			default:
				// message.reply(`${robotEmoji} ¿Estás seguro de que ese comando existe?`);
				break;
		}
		// } else {
		//	return message.reply(`${robotEmoji} No tienes permisos para usar este comando.`);
		// }
	}

});

module.exports = {
	client,
	setFetchedData,
	setRefreshDataCallback,
}