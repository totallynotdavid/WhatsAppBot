/* Packages */
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ytdl = require('ytdl-core');
const moment = require('moment');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const youtubeKey = process.env.youtubeKey;

/* Commands stored as JSON files for better readability */
const helpListCommands = require('../fixedData/helpListCommands.json');
const CAEListCommands = require('../fixedData/CAEListCommands.json');

function commandGenerator(fixedDataCommand, message, stringifyMessage) {
  try {
    for (const command of fixedDataCommand) {
      if (command.command === stringifyMessage[1]) {
        const builtMessage = `🤖\n\n${command.message}`;
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

function getHelpMessage(prefix, stringifyMessage, helpCommand, message) {
  try {

    switch (true) {
      // If the message is just "${prefix}ayuda", print all the commands
      case stringifyMessage.length === 1:
        const commands = helpListCommands.map(command => `\`\`\`${command.command}\`\`\``);
        const helpMessage = `🤖 Los comandos disponibles son:\n\n${commands.join(' \n')}\n\nPara obtener más información sobre un comando, escribe:\n\n\`\`\`${prefix}${helpCommand} comando\`\`\``;
        message.reply(helpMessage);
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

function getCAEMessage(prefix, stringifyMessage, caeCommand, message) {
  try {
    switch (true) {
      case stringifyMessage.length === 1 :
        message.reply(`🔗 linktr.ee/caefisica`);
        break;
      case stringifyMessage.length === 2 :
        const fixedDataCommand = CAEListCommands;
        commandGenerator(fixedDataCommand, message, stringifyMessage);
        break;
      default:
        message.reply(`🤖 Este comando no es válido. Usa ${prefix}${caeCommand} ayuda para ver los comandos disponibles.`);
    }
  } catch (err) {
    console.error(err);
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

function convertMp3ToOgg(filepath, transformedFilepath, message, client, MessageMedia) {
  const command = `ffmpeg -i ${filepath} -c:a libopus ${transformedFilepath}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    const media = MessageMedia.fromFilePath(transformedFilepath);
    client.sendMessage(message.from, media, { sendAudioAsVoice : true });
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

async function mp3FromYoutube(message, client, MessageMedia, query) {
  switch (true) {
    case query.includes('youtube.com') || query.includes('youtu.be') :
      const videoId = getYoutubeVideoId(query);
      const videoLength = await getVideoLength(videoId)
      switch (true) {
        case videoLength <= 600:
          const audio = ytdl(query, {
            filter: 'audioonly',
            quality: 'lowestaudio',
          });
          const info = await ytdl.getInfo(query);
        
          const filepath = `./audio/${info.videoDetails.videoId}.mp3`;
          const transformedFilepath = `./audio/${info.videoDetails.videoId}.ogg`;
          const writeStream = fs.createWriteStream(filepath);
          audio.pipe(writeStream);
        
          audio.on ('end', () => {
            console.log('Audio downloaded successfully');
            convertMp3ToOgg(filepath, transformedFilepath, message, client, MessageMedia);
          });
          break;
        default:
          message.reply(`🤖 El video es demasiado largo. El límite es de 10 minutos.`);
        }
      break;
    default:
      message.reply(`🤖 La URL no es válida.`);
      break;
  }
}

async function getRedditImage(message, subreddit, client, MessageMedia) {
  try {
    const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    const imageData = await response.json();
    const imageMedia = await MessageMedia.fromUrl(imageData.url);
    client.sendMessage(message.from, imageMedia, { caption: imageData.title });
  } catch {
    // reply with an error message and react with a cross
    message.reply("Hubo un error al tratar de enviar la imagen.");
  }
}

async function getWikiArticle(message, query, language_code, UserNameWS) {
  try {
    const url = `https://${language_code}.wikipedia.org/api/rest_v1/page/summary/${query}`;
    const res = await fetch(url);
    const data = await res.json();

    const handleDisambiguation = () => {
      const disambiguation = data.content_urls.desktop.page;
      message.reply(`🤖 ${UserNameWS}, tu búsqueda dió resultados ambiguos, puedes verlos aquí: ${disambiguation}`);
    }

    const handleNotFound = async () => {
      const search_url = `https://${language_code}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json`;
      const response = await fetch(search_url);
      const data = await response.json();
      const similarArticles = data.query.search;
      const answer = similarArticles[0].title.replace(/ /g, "_");;
      message.reply(`🤖 ${UserNameWS}, tu búsqueda no dió resultados, puedes ver artículos similares aquí: https://${language_code}.wikipedia.org/wiki/${answer}`);
    }

    const handleSuccess = () => {
      message.reply(`🤖 *${data.title}*: ${data.extract}`);
    }

    switch (data.type) {
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

    switch (data.items[0].id.kind) {
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
    console.log("No results found for the given query.");
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

async function convertImageToSticker(chat, message, sticker, UserNameWS) {
  try {
    chat.sendMessage(sticker, {
      sendMediaAsSticker: true,
      stickerName: `${UserNameWS}`,
      stickerAuthor: "davibot",
    });
    message.reply("🤖 ¡Sticker en camino!");
  } catch (e) {
    message.reply("🤖 Hubo un error al tratar de convertir esta imagen en sticker.");
  }
}

async function convertUrlImageToSticker (chat, message, sticker, UserNameWS) {
  convertImageToSticker(chat, message, sticker, UserNameWS);
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