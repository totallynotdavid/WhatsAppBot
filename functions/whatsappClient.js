// Import the required modules
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

const general = require('../commands/general');
const admin = require('../commands/admin');
const logFunctionCall = require('./logFunctionCall');
const spotifyAPI = require('./spotifyAPI');
const administrators = require('../fixedData/administrators.json');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    //executablePath: './node_modules/whatsapp-web.js/node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome' // Path to the Chrome executable on Linux
    executablePath: './node_modules/puppeteer/.local-chromium/win64-982053/chrome-win/chrome.exe' // Path to the Chrome executable on Windows
  }
});
  
// Generate a QR code for the user to scan with their device
client.on('qr', qr => {
  qrcode.generate(qr, {
    small: true
  });
});
  
// Handle any authentication failures
client.on('auth_failure', authFailureMessage => {
  console.error('Error de autenticación', authFailureMessage);
})

client.on('ready', () => {
  console.log('Estamos listos, ¡el bot está en linea!');
});

/* COMMANDS */

client.on('message_create', async message => {

  let chat = await message.getChat();

  // Prefixes for the commands
  let prefix = '!';
  let prefix_admin = '@';
  // Get the full message sent by the user. Example: from "!spot dkdk" it will get "!spot dkdk"
  let stringifyMessage = message.body.trim().split(/\s+/);

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */
  const loggedMentionEveryone = logFunctionCall(message, admin.mentionEveryone);
  const loggedGetHelpMessage = logFunctionCall(message, general.getHelpMessage);
  const loggedGetCAEMessage = logFunctionCall(message, general.getCAEMessage);
  const loggedConvertImageToSticker = logFunctionCall(message, general.convertImageToSticker);
  const loggedconvertUrlImageToSticker = logFunctionCall(message, general.convertUrlImageToSticker);
  const loggedSendSpotifyAudio = logFunctionCall(message, spotifyAPI.sendSpotifyAudio);
  const loggedGetFromisMessage = logFunctionCall(message, general.getRedditImage);
  const loggedGetWikiMessage = logFunctionCall(message, general.getWikiArticle);
  const loggedGetYoutubeMessage = logFunctionCall(message, general.getYoutubeVideo);
  const loggedSearchYoutubeMessage = logFunctionCall(message, general.searchYoutubeVideo);
  const loggedGetPlayMessage = logFunctionCall(message, general.mp3FromYoutube);

  if (message.body.startsWith(prefix)) {

    const helpCommand = 'help';
    const stickerCommand = 'sticker';
    const stickerUrlCommand = 'url';
    const spotifyCommand = 'spot';
    const caeCommand = 'cae';
    const fromisCommand = 'fromis';
    const wikiCommand = 'w';
    const ytCommand = 'yt';
    const playCommand = 'play';

    /* Method to get the name of a user */
    const getUserNameWS = await message.getContact();
    const UserNameWS = getUserNameWS.pushname;

    /* Get all the text after the command (yt & wiki) */
    const query = message.body.split(' ').slice(1).join(' ');
  
    if (stringifyMessage[0] === `${prefix}${helpCommand}`) {
      loggedGetHelpMessage(prefix, stringifyMessage, helpCommand, message);
    }

    if (stringifyMessage[0] === `${prefix}${caeCommand}`) {
      loggedGetCAEMessage(prefix, stringifyMessage, caeCommand, message);
    }

    if (message.body === `${prefix}${stickerCommand}`) {
      try {
        switch(true) 
        {
          case message.hasQuotedMsg:
            const quoted = await message.getQuotedMessage();
            if (quoted.hasMedia) {
              const sticker = await quoted.downloadMedia();
              await loggedConvertImageToSticker(chat, message, sticker, UserNameWS);
            };
            break;
          case message.hasMedia:
            const sticker = await message.downloadMedia();
            await loggedConvertImageToSticker(chat, message, sticker, UserNameWS);
            break;
          default:
            message.reply("Debes adjuntar la imagen a la que quieres convertir en sticker.");
            message.react("⚠️");
            break;
        }
      } catch (error) {
        console.log(error);
      }
    }

    if (stringifyMessage[0] === `${prefix}${stickerUrlCommand}`) {
      const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;
      const imageOrVideoRegex = /\.(jpg|jpeg|png|mp4)$/i;

      if (stringifyMessage.length !== 2) {
        message.reply(`🤖 Debes adjuntar solo la URL de la imagen o video a la que quieres convertir en sticker.`);
        message.react("⚠️");
      } else {
        console.log(`Received URL: ${stringifyMessage[1]}`);

        const stickerURL = stringifyMessage[1];

        if (urlRegex.test(stickerURL) && imageOrVideoRegex.test(stickerURL)) {
          try {
            const response = await fetch(stickerURL);
            const [contentType, contentLength] = (response.headers.get('content-type') || '').split(';');

            if (response.ok && contentType && (contentType.startsWith('image/') || contentType.startsWith('video/'))) {
              if (contentType.startsWith('video/mp4') && contentLength && parseInt(contentLength.split('=')[1]) > 20 * 1000) {
                message.reply(`🤖 El video no puede ser mayor a 20 segundos.`);
              } else {
                const sticker = await MessageMedia.fromUrl(stickerURL);
                loggedconvertUrlImageToSticker(chat, message, sticker, UserNameWS);
              }
            } else {
              message.reply(`🤖 La URL no es una imagen o video válido.`);
            }
          } catch (error) {
            console.error(error);
            message.reply(`🤖 Hubo un error al intentar obtener la imagen o video de la URL.`);
          }
        } else {
          message.reply(`🤖 Debes adjuntar una URL válida.`);
        }
      }
    }

    if (stringifyMessage[0] === `${prefix}${spotifyCommand}`) {
      switch (stringifyMessage.length) 
      {
        case 1:
          message.reply(`🤖 Debes adjuntar la canción de Spotify.`);
          message.react("⚠️");
          break;
        default:
          const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
          const song = await spotifyAPI.getSongData(url);
          await spotifyAPI.downloadSpotifyAudio(song);
          await loggedSendSpotifyAudio(MessageMedia, client, message, song);
          break;
      }
    }    

    if (message.body === `${prefix}${fromisCommand}`) {
      const subreddit = general.capitalizeText(fromisCommand);
      loggedGetFromisMessage(message, subreddit, client, MessageMedia);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${wikiCommand}`)) {
      const languageCode = message.body.split(' ')[0].slice(2) || 'en';
      loggedGetWikiMessage(message, query, languageCode, UserNameWS);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${ytCommand}`)) {
      switch (true) 
      {
        case (stringifyMessage.length === 1):
          message.reply(`🤖 Debes adjuntar el link del video de YouTube.`);
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtube.com`)) ):
          loggedGetYoutubeMessage(message, client, MessageMedia, query);
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtu.be`)) ):
          loggedGetYoutubeMessage(message, client, MessageMedia, query);
          break;
        default:
          loggedSearchYoutubeMessage(message, client, MessageMedia, query);
          break;
      }
    }

    if (stringifyMessage[0].startsWith(`${prefix}${playCommand}`)) {
      const commands = {
        1: {
          notice: `🤖 Debes adjuntar el link del video de YouTube.`,
          commandMode: null,
        },
        2: {
          commandMode: `fullVideo`,
        },
        3: {
          commandMode: `cutAtStart`,
        },
        4: {
          commandMode: `cutVideo`,
        },
        default: {
          notice: `🤖 Revisa la sintaxis del comando.`,
          commandMode: null,
        },
      };
      
      const { notice = '', commandMode } = commands[stringifyMessage.length] || commands.default;
      if (notice) {
        message.reply(notice);
      } else {
        loggedGetPlayMessage(commandMode, message, client, MessageMedia, stringifyMessage);
      }      

      /*
      console.time('mp3FromYoutube');
      loggedGetPlayMessage(message, client, MessageMedia, query);
      console.timeEnd('mp3FromYoutube');
      */
    }

  }

  if (message.body.startsWith(prefix_admin)) {

    const mentionEveryoneCommand = 'todos';
    const admins = administrators.filter(a => message.from === `${a.phone}`);
  
    if (admins.length > 0 && message.body === `${prefix_admin}${mentionEveryoneCommand}`) {
      loggedMentionEveryone(chat, client, message);
    }
  }  

});

module.exports = client;