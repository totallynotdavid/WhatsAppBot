// Import the required modules
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
  let stringifyMessage = message.body.split(' ');

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

    const helpCommand = 'ayuda';
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
        switch(true) {
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

      const stickerURL = stringifyMessage[1];

      switch(true) {
        case typeof stickerURL !== 'undefined' && stickerURL !== null && stickerURL !== '':
          const sticker = await MessageMedia.fromUrl(stickerURL);
          loggedconvertUrlImageToSticker(chat, message, sticker, UserNameWS);
          break;
        default:
          message.reply("Debes adjuntar la imagen a la que quieres convertir en sticker.");
          message.react("⚠️");
          break;
      }
    }

    if (stringifyMessage[0] === `${prefix}${spotifyCommand}`) {

      /* Preparing variables */
      const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
      const song = await spotifyAPI.getSongData(url);

      if (song === null) {
        message.reply(`🤖 No se encontró una preview de la canción *${song.name}* de *${song.artists[0].name}*`);
        message.react("⚠️");
        return;
      }

      await spotifyAPI.downloadSpotifyAudio(song);
      await loggedSendSpotifyAudio(MessageMedia, client, message, song);

    }

    if (stringifyMessage[0] === `${prefix}${fromisCommand}`) {
      const subreddit = general.capitalizeText(fromisCommand);
      //general.getRedditImage(message, subreddit, client, MessageMedia);
      loggedGetFromisMessage(message, subreddit, client, MessageMedia);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${wikiCommand}`)) {
      const language_code = message.body.split(' ')[0].slice(2) || 'en';
      //general.getWikiArticle(message, query, language_code, UserNameWS);
      loggedGetWikiMessage(message, query, language_code, UserNameWS);
    }

    if (stringifyMessage[0].startsWith(`${prefix}${ytCommand}`)) {
      switch (true) {
        case (stringifyMessage.length === 1):
          message.reply("Debes adjuntar el link del video de YouTube.");
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtube.com`)) ):
          //general.getYoutubeVideo(message, client, MessageMedia, query);
          loggedGetYoutubeMessage(message, client, MessageMedia, query);
          break;
        case (stringifyMessage.length === 2 && (query.includes(`youtu.be`)) ):
          //general.getYoutubeVideo(message, client, MessageMedia, query);
          loggedGetYoutubeMessage(message, client, MessageMedia, query);
          break;
        default:
          //general.searchYoutubeVideo(message, client, MessageMedia, query);
          loggedSearchYoutubeMessage(message, client, MessageMedia, query);
          break;
      }
    }

    if (stringifyMessage[0].startsWith(`${prefix}${playCommand}`)) {
      console.time('mp3FromYoutube');
      loggedGetPlayMessage(message, client, MessageMedia, query);
      //general.mp3FromYoutube(message, client, MessageMedia, query)
      console.timeEnd('mp3FromYoutube');
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