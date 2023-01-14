/* Packages */
const fetch = require('node-fetch');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const youtubeKey = process.env.youtubeKey;

/* Commands stored as JSON files for better readability */
const helpListCommands = require('../fixedData/helpListCommands.json');
const CAEListCommands = require('../fixedData/CAEListCommands.json');

function codeWrapper(message) {
  return "```" + message + "```";
}

function commandGenerator(fixedDataCommand, message, stringifyMessage) {
  try {
    for (const command of fixedDataCommand) {
      if (command.command === stringifyMessage[1]) {
        const builtMessage = `🤖 ${codeWrapper(stringifyMessage[1])}: ${command.message}`;
        message.reply(builtMessage);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function capitalizeText(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

function getHelpMessage(prefix, stringifyMessage, helpCommand, message, client, List) {
  try {

    switch (true) 
    {
      // If the message is just "${prefix}ayuda", print all the commands
      case stringifyMessage.length === 1:
        const examples = helpListCommands.map(command => `${command.usage}`);
        const section = new List(
          "Buh, soy un bot sin habilidades telepáticas... nah. ¿O quizá sí?",
          "Cómo usar los comandos",
          [
            {
              title: `Usa "${prefix}${helpCommand} <comando>" para más detalles sobre un comando`,
              rows: examples.map(example => ({title: example})),
            }
        ]);
        client.sendMessage(message.from, section);
        break;
      // If the message is "${prefix}ayuda comando", print the info about that command
      case stringifyMessage.length === 2:
        const fixedDataCommand = helpListCommands;
        commandGenerator(fixedDataCommand, message, stringifyMessage);
        break;
      default:
        message.reply(`🤖 Este comando no es válido. Usa ${prefix}${helpCommand} para ver los comandos disponibles.`);
    }

  } catch (err) {
    console.error(err);
  }
}

function getCAEMessage(prefix, stringifyMessage, caeCommand, message, client, Buttons) {
  try {
    switch (stringifyMessage.length) 
    {
      case 1 :
        message.reply(`🔗 linktr.ee/caefisica`);

        const buttonsReplyUrl = new Buttons(
          'Podrás encontrar: libros y canales de YouTube recomendados para el estudio de la Física', 
          [
            { body: `${prefix}${caeCommand} calculo` },
            { body: `${prefix}${caeCommand} fisica_matematica` },
            { body: `${prefix}${caeCommand} mecanica_clasica` },
            { body: '🔗 Linktree', url: 'https://linktr.ee/caefisica' },
            { body: '📚 BiblioteCAE', url: 'https://bit.ly/cae_biblioteca'}
          ], 
          'Guías de Estudio', 
          'Redactado por el equipo del Centro de Apoyo al Estudiante de Física'
        );
        client.sendMessage(message.from, buttonsReplyUrl);      
        break;
      case 2 :
        const fixedDataCommand = CAEListCommands;
        commandGenerator(fixedDataCommand, message, stringifyMessage);
        break;
      default:
        message.reply(`🤖 Este comando no es válido. Usa ${prefix}${caeCommand} ayuda para ver los comandos disponibles.`);
    }
  } catch (err) {
    errorMessage = err;
    console.error(errorMessage);
  }
}

function getYoutubeVideoId(url) {
  // Grande, domi, https://stackoverflow.com/a/71006865/14035380
  const youtubeRegex = /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/;

  let videoId = null;

  // Check if the URL matches the YouTube short URL pattern
  if (youtubeRegex.test(url)) {
    videoId = url.match(youtubeRegex)[3];
  } else {
    throw new Error('Invalid YouTube URL');
  }

  return videoId;
}

/* Delete? */
function convertMp3ToOgg(videoFilename, outputFilename, message, client, MessageMedia) {
  const command = `ffmpeg -i ${videoFilename} -c:a libopus ${outputFilename}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    const media = MessageMedia.fromFilePath(outputFilename);
    client.sendMessage(message.id.remote, media, { sendAudioAsVoice : true });
  });
}

async function getVideoLength(videoId) {
  // Construct the URL to send the request to
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeKey}&fields=items(contentDetails(duration))&part=contentDetails`;

  // Send the request and get the response
  const response = await fetch(url);
  const data = await response.json();

  // The duration of the video is returned in ISO 8601 format,
  // so we need to parse it to get the total length in seconds
  const duration = data.items[0].contentDetails.duration;
  const durationInSeconds = moment.duration(duration).asSeconds();

  // Log the length of the video to the console
  console.log(`The video is ${durationInSeconds} seconds long`);
  return durationInSeconds;
}

async function mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage) {
  const youtubeURL = stringifyMessage[1];

  if (youtubeURL.includes('youtube.com') || youtubeURL.includes('youtu.be')) {
    const videoID = getYoutubeVideoId(youtubeURL);
    const videoLength = await getVideoLength(videoID);

    //const startTime = stringifyMessage[2];
    //const endTime = stringifyMessage[3];
    const videoFilename = `audio/${videoID}.weba`;
    const outputFilename = `audio/${videoID}.ogg`;

    const commands = {
      fullVideo: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} -o "audio/%(id)s.%(ext)s"`,
      /*
      cutAtStart: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} --external-downloader ffmpeg --external-downloader-args "-ss ${startTime}" -o "audio/%(id)s.%(ext)s"`,
      cutAtEnd: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} --external-downloader ffmpeg --external-downloader-args "-to ${endTime}" -o "audio/%(id)s.%(ext)s"`,
      cutVideo: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} --external-downloader ffmpeg --external-downloader-args "-ss ${startTime} -to ${endTime}" -o "audio/%(id)s.%(ext)s"`,
      */
    };

    /*
    if(startTime > videoLength || endTime > videoLength) {
      message.reply(`🤖 El tiempo de inicio o fin es mayor que la duración del video.`);
      return;
    }

    if(startTime > endTime) {
        message.reply(`🤖 El tiempo de inicio es mayor que el tiempo de fin.`);
        return;
    }
    */

    const command = commands[commandMode] || `comando no válido`;

    if (videoLength <= 600) {
      console.log(command);
      exec(command, (error) => {
        if (error) {
          console.error(`Error: ${error}`);
          return;
        }
        convertMp3ToOgg(videoFilename, outputFilename, message, client, MessageMedia);
      });
    } else {
      message.reply(`🤖 El video es demasiado largo. El límite es de 10 minutos.`);
    }
  } else {
    message.reply(`🤖 La URL no es válida.`);
  }

}

async function getRedditImage(message, subreddit, client, MessageMedia) {
  try {

    const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    if (!response.ok) {
      throw new Error(`Unable to fetch image: ${response.statusText}`);
    }

    const imageData = await response.json();
    if (!imageData) {
      throw new Error("Unable to parse image data");
    }

    const imageMedia = await MessageMedia.fromUrl(imageData.url);
    client.sendMessage(message.from, imageMedia, { caption: imageData.title });

  } catch (err) {
    message.reply("🤖 Hubo un error al tratar de enviar la imagen.");
    console.error(err);
  }
}

async function getWikiArticle(message, query, languagecode, senderName, client, MessageMedia) {
  try {
    const url = `https://${languagecode}.wikipedia.org/api/rest_v1/page/summary/${query}`;
    const res = await fetch(url);
    const data = await res.json();

    const handleDisambiguation = () => {
      const disambiguation = data.content_urls.desktop.page;
      message.reply(`🤖 ${senderName}, tu búsqueda dió resultados ambiguos, puedes verlos aquí: ${disambiguation}`);
    }

    const handleNotFound = async () => {
      const searchURL = `https://${languagecode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json`;
      const response = await fetch(searchURL);
      const data = await response.json();
      if (data.query.searchinfo.totalhits === 0) {
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados.`);
      } else {
        const similarArticles = data.query.search;
        const answer = similarArticles[0].title.replace(/ /g, "_");;
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados, puedes ver artículos similares aquí: https://${languagecode.toLowerCase()}.wikipedia.org/wiki/${answer}`);
      }
    }

    const handleSuccess = async () => {
      const summary = `🤖 *${data.title}*: ${data.extract}`;
      if (data.originalimage) {
        const imageMedia = await MessageMedia.fromUrl(data.originalimage.source);
        client.sendMessage(message.from, imageMedia, { caption: summary })
      } else {	
      message.reply(summary);
      }
    }

    switch (data.type) 
    {
      case "disambiguation":
        handleDisambiguation();
        break;
      case "https://mediawiki.org/wiki/HyperSwitch/errors/not_found":
        handleNotFound();
        break;
      default:
        handleSuccess();
    }
  } catch (err) {
    console.error(err);
  }
}

async function getYoutubeVideo(message, client, MessageMedia, query) {
  try {
    // Extract the video ID from the YouTube URL
    const videoID = getYoutubeVideoId(query);

    // Construct the search URL using the video ID and the YouTube API key
    const searchUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoID}&key=${youtubeKey}`;
    // Fetch the video data from the YouTube API
    const response = await fetch(searchUrl);
    const data = await response.json();

    // Extract the video title, thumbnail, and channel from the response data
    const title = data.items[0].snippet.title;
    const thumbnail = data.items[0].snippet.thumbnails.high.url;
    const channel = data.items[0].snippet.channelTitle;

    // Create a new MessageMedia object using the thumbnail URL
    const media = await MessageMedia.fromUrl(thumbnail);

    // Send the video information to the client, along with the thumbnail image
    await client.sendMessage(message.from, media, {
      caption: `🎬: ${title}\n👤: ${channel}\n🔗: https://youtu.be/${videoID}`,
    });
  } catch (err) {
    console.error(err);
    message.reply(`🤖 Debes adjuntar el link del video de YouTube.`);
  }
}

async function searchYoutubeVideo(message, client, MessageMedia, query) {
  // Build the search URL with the query and youtubeKey
  const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&key=${youtubeKey}`;

  // Make the search request and get response
  const response = await fetch(searchURL);
  const data = await response.json();

  // Check if there are any results
  if (data.items && data.items.length > 0) {
    // Get the video, playlist, and channel IDs from the response
    const { videoId, playlistId, channelId } = data.items[0].id;

    switch (data.items[0].id.kind) 
    {
      case "youtube#video":
        // Send the media message for a video
        sendMediaMessage(videoId, "🎬", "https://youtu.be/", message, client, MessageMedia);
        break;
      case "youtube#playlist":
        // Send the media message for a playlist
        sendMediaMessage(playlistId, "🎵", "https://www.youtube.com/playlist?list=", message, client, MessageMedia);
        break;
      case "youtube#channel":
        // Send the media message for a channel
        sendMediaMessage(channelId, "📺", "https://www.youtube.com/channel/", message, client, MessageMedia);
        break;
      default:
        // Handle the case when there is no video, playlist, or channel
        message.reply("🤖 No se encontró ningún video, playlist, o canal.")
        break;
    }
  } else {
    // Handle the case when there are no results
    message.reply("🤖 Hubo un error con tu búsqueda, intenta de nuevo.")
  }
}


// This function sends a media message with the thumbnail and caption for a video, playlist, or channel
//
// - id: the ID of the video, playlist, or channel
// - emoji: the emoji to use in the caption (e.g. "🎬" for a video, "🎵" for a playlist, "📺" for a channel)
// - urlPrefix: the URL prefix for the video, playlist, or channel (e.g. "https://youtu.be/" for a video,
//   "https://www.youtube.com/playlist?list=" for a playlist,
//   "https://www.youtube.com/channel/" for a channel)
//

async function sendMediaMessage(id, emoji, urlPrefix, message, client, MessageMedia) {
  // Build the URL for the details request
  const detailsUrl = `https://www.googleapis.com/youtube/v3/${emoji === "🎬" ? "videos" : emoji === "🎵" ? "playlists" : "channels"}?part=snippet&id=${id}&key=${youtubeKey}`;

  // Make the request and get the JSON response
  const response = await fetch(detailsUrl);
  const data = await response.json();

  // Get the details from the response
  const { title, thumbnails, channelTitle } = data.items[0].snippet;
  const thumbnailUrl = thumbnails.high.url;

  // Create the media message using the thumbnail URL
  const media = await MessageMedia.fromUrl(thumbnailUrl, { unsafeMime: true });

  // Send the media message with the caption
  await client.sendMessage(message.from, media, {
    caption: `${emoji}: ${title}\n👤: ${channelTitle}\n🔗: ${urlPrefix}${id}`,
  });
}

async function convertImageToSticker(chat, message, sticker, senderName, senderNumber) {
  try {
    if (senderName.length < 2) {
      var match = senderNumber.match(/\d{11}/);
      senderName = `+${match[0]}, necesitas un nombre para usar stickers`;
    }
    chat.sendMessage(sticker, {
      sendMediaAsSticker: true,
      stickerName: `${senderName}`,
      stickerAuthor: "davibot",
    });
    message.reply("🤖 ¡Sticker en camino!");
  } catch (e) {
    message.reply("🤖 Hubo un error al tratar de convertir esta imagen en sticker.");
  }
}

async function convertUrlImageToSticker (chat, message, sticker, senderName) {
  convertImageToSticker(chat, message, sticker, senderName);
}

module.exports = {
  capitalizeText,
  getHelpMessage,
  getCAEMessage,
  getRedditImage,
  getWikiArticle,
  getYoutubeVideo,
  searchYoutubeVideo,
  mp3FromYoutube,
  convertImageToSticker,
  convertUrlImageToSticker,
};