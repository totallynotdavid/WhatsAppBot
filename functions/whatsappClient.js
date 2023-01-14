// Import the required modules
const { Client, LocalAuth, MessageMedia, Buttons, List } = require('whatsapp-web.js');
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
  // Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]"
  let stringifyMessage = message.body.trim().split(/\s+/);

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */

  const functions = {
    mentionEveryone: admin.mentionEveryone,
    getHelpMessage: general.getHelpMessage,
    getCAEMessage: general.getCAEMessage,
    convertImageToSticker: general.convertImageToSticker,
    convertUrlImageToSticker: general.convertUrlImageToSticker,
    sendSpotifyAudio: spotifyAPI.sendSpotifyAudio,
    getRedditImage: general.getRedditImage,
    getWikiArticle: general.getWikiArticle,
    getYoutubeVideo: general.getYoutubeVideo,
    searchYoutubeVideo: general.searchYoutubeVideo,
    mp3FromYoutube: general.mp3FromYoutube
  }
  
  Object.keys(functions).forEach(functionName => {
    functions[functionName] = logFunctionCall(message, functions[functionName]);
  });

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

    /* Method to get the name and number of a user */
    const contactInfo = await message.getContact();
    const senderName = contactInfo.pushname;
    const senderNumber = message.from;

    /* Get all the text after the command (yt & wiki) */
    const query = message.body.split(' ').slice(1).join(' ');
  
    if (stringifyMessage[0] === `${prefix}${helpCommand}`) {
      functions.getHelpMessage(prefix, stringifyMessage, helpCommand, message, client, List);
    }

    if (stringifyMessage[0] === `${prefix}${caeCommand}`) {
      functions.getCAEMessage(prefix, stringifyMessage, caeCommand, message, client, Buttons);
    }

    if (message.body === `${prefix}${stickerCommand}`) {
      try {
        switch(true) 
        {
          case message.hasQuotedMsg:
            const quoted = await message.getQuotedMessage();
            if (quoted.hasMedia) {
              const sticker = await quoted.downloadMedia();
              await functions.convertImageToSticker(chat, message, sticker, senderName, senderNumber);
            };
            break;
          case message.hasMedia:
            const sticker = await message.downloadMedia();
            await functions.convertImageToSticker(chat, message, sticker, senderName, senderNumber);
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
      // GIFs are not supported because they are not animated stickers
      const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.%]+(\.(jpg|jpeg|png|mp4))$/;
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
                functions.convertUrlImageToSticker(chat, message, sticker, senderName);
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
          await functions.sendSpotifyAudio(MessageMedia, client, message, song);
          break;
      }
    }    

    if (message.body === `${prefix}${fromisCommand}`) {
      const subreddit = general.capitalizeText(fromisCommand);
      functions.getRedditImage(message, subreddit, client, MessageMedia);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${wikiCommand}`)) {
      const languageCode = message.body.split(' ')[0].slice(2) || 'es';
      functions.getWikiArticle(message, query, languageCode, senderName, client, MessageMedia);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${ytCommand}`)) {
      switch (true) 
      {
        case (stringifyMessage.length === 1):
          message.reply(`🤖 Debes adjuntar el link del video de YouTube.`);
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtube.com`)) ):
          functions.getYoutubeVideo(message, client, MessageMedia, query);
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtu.be`)) ):
          functions.getYoutubeVideo(message, client, MessageMedia, query);
          break;
        default:
          functions.searchYoutubeVideo(message, client, MessageMedia, query);
          break;
      }
    }

    if (stringifyMessage[0].startsWith(`${prefix}${playCommand}` && stringifyMessage.length <= 2)) {
      const commands = {
        1: {
          notice: `🤖 Debes adjuntar el link del video de YouTube.`,
          commandMode: null,
        },
        2: {
          commandMode: `fullVideo`,
        },
        /*
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
        */
      };
      
      const { notice = '', commandMode } = commands[stringifyMessage.length] || commands.default;
      if (notice) {
        message.reply(notice);
      } else {
        functions.mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage);
      }

      /*
      console.time('mp3FromYoutube');
      functions.mp3FromYoutube(message, client, MessageMedia, query);
      console.timeEnd('mp3FromYoutube');
      */
    }

  }

  if (message.body.startsWith(prefix_admin)) {

    const mentionEveryoneCommand = 'todos';
    const admins = administrators.filter(a => message.from === `${a.phone}`);
  
    if (admins.length > 0 && message.body === `${prefix_admin}${mentionEveryoneCommand}`) {
      functions.mentionEveryone(chat, client, message);
    }
  }

});

module.exports = client;