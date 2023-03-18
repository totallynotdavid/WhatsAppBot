/* Packages */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios').default;
const moment = require('moment');
const { exec } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const youtubeKey = process.env.youtubeKey;

/* Commands stored as JSON files for better readability */
const helpListCommands = require('../fixedData/helpListCommands.json');
const CAEListCommands = require('../fixedData/CAEListCommands.json');

function codeWrapper(message) {
  return '```' + message + '```';
}

function commandGenerator(fixedDataCommand, message, stringifyMessage) {
  try {
    let commandFound = false;

    for (const command of fixedDataCommand) {
      if (command.command === stringifyMessage[1]) {
        commandFound = true;
        const builtMessage = `🤖 ${codeWrapper(stringifyMessage[1])}: ${command.message}`;
        message.reply(builtMessage);
        break;
      }
    }

    if (!commandFound) {
      message.reply(`🤖 Parece que ${codeWrapper(stringifyMessage[1])} no existe.`);
    }
  } catch (err) {
    console.error(err);
  }
}

function capitalizeText(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${err}`);
    } else {
      console.log(`File ${filePath} deleted successfully`);
    }
  });
}

function getHelpMessage(prefix, stringifyMessage, helpCommand, message, client, List) {
  try {
    let examples, helpList;
    switch (stringifyMessage.length) {
      case 1:
        examples = helpListCommands.map(command => `${prefix}${command.usage}`);
        helpList = new List(
          'Buh, soy un bot sin habilidades telepáticas... nah. ¿O quizá sí?',
          'Cómo usar los comandos',
          [
            {
              title: `Usa "${prefix}${helpCommand} <comando>" para más detalles sobre un comando`,
              rows: examples.map(example => ({title: example})),
            },
        ]);
        client.sendMessage(message.id.remote, helpList);
        break;
      case 2:
        commandGenerator(helpListCommands, message, stringifyMessage);
        break;
      default:
        message.reply(`🤖 Este comando no es válido. Usa ${prefix}${helpCommand} para ver los comandos disponibles.`);
    }

  } catch (err) {
    console.error(err);
  }
}

function getCAEMessage(prefix, stringifyMessage, caeCommand, message/*, client, Buttons*/) {
  try {
    //let buttonsMessage;
    switch (stringifyMessage.length) {
      case 1:
        /*
        buttonsMessage = new Buttons(
          '¡Aquí tienes algunos recursos adicionales para ayudarte en el estudio de la Física!', 
          [
            { body: '🔗 Recursos recomendados', url: 'https://linktr.ee/caefisica' },
            { body: '📚 BiblioteCAE', url: 'https://bit.ly/cae_biblioteca'},
          ], 
          'Guías de Estudio', 
          'Proporcionado por el equipo del Centro de Apoyo al Estudiante de Física'
        );
        client.sendMessage(message.id.remote, buttonsMessage);
        */
        message.reply('🤖 Este comando está en mantenimiento. Prueba más tarde.');
        break;
      case 2:
        commandGenerator(CAEListCommands, message, stringifyMessage);
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
  const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&#].*)?$/;

  let videoId = null;

  if (youtubeRegex.test(url)) {
    videoId = url.match(youtubeRegex)[1];
  } else {
    throw new Error('Invalid YouTube URL');
  }

  return videoId;
}

function getYoutubePlaylistId(url) {
  const playlistRegex = /(?<=list=)[A-Za-z0-9-_]+/;

  let playlistId = null;

  if (playlistRegex.test(url)) {
    playlistId = url.match(playlistRegex)[0];
    console.log(`playlistId: ${playlistId}`)
  } else {
    throw new Error('Invalid YouTube URL');
  }

  return playlistId;
}

function hasNonWhitespace(str) {
  return /[^ \t\n\r\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/.test(str);
}

function containsVisibleChars(str) {
  // Check if the string contains any alphanumeric or non-whitespace character
  return /[a-zA-Z0-9]/.test(str) && hasNonWhitespace(str);
}

async function getYoutubeChannelId(url) {
  const channelRegex = /channel\/([A-Za-z0-9-_]+)/;
  const userRegex = /user\/([A-Za-z0-9-_]+)/;
  const usernameRegex = /youtube\.com\/@([A-Za-z0-9]+)/;

  let channelId = null;
  let match;
  
  if (url.startsWith('https://www.youtube.com/channel/')) {
    match = channelRegex.exec(url);
    channelId = match[1];
    console.log(`Channel ID (channel): ${channelId}`	)
  } else if (url.startsWith('https://www.youtube.com/user/')) {
    match = userRegex.exec(url);
    channelId = match[1];
    console.log(`Channel ID (user): ${channelId}`	)
  } else if (match = usernameRegex.exec(url)) {
    const preChannelId = match[1];
    channelId = await getChannel(preChannelId);
    console.log(`Channel ID (custom): ${channelId}`);
  }
  else {
    throw new Error('Invalid YouTube URL');
  }

  return channelId;
}

async function getChannel(username) {
  const baseUrl = 'https://www.googleapis.com/youtube/v3/';
  try {
    const searchResults = await fetchData(`${baseUrl}search?key=${youtubeKey}&part=snippet&q=${username}&maxResults=50&order=relevance&type=channel`);
    const channelIds = searchResults.items.map(item => item.id.channelId);
    const channelDetails = await fetchData(`${baseUrl}channels?key=${youtubeKey}&part=snippet&id=${channelIds.join(',')}&maxResults=50`);
    const finalUsername = `@${username}`;
    const selectedChannel = channelDetails.items.find(item => item.snippet.customUrl === finalUsername);
    if (selectedChannel) {
      const channelId = selectedChannel.id;
      console.log(`Channel selected: ${channelId}`)
      return channelId;
    } else {
      throw new Error(`Haven't found a channel with the username: ${username}`);
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function fetchData(url) {
  const res = await axios.get(url);
  return res.data;
}

function convertMp3ToOgg(videoFilename, outputFilename, message, client, MessageMedia) {
  const command = `ffmpeg -i ${videoFilename} -c:a libopus ${outputFilename}`;
  exec(command, (error) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    const media = MessageMedia.fromFilePath(outputFilename);
    client.sendMessage(message.id.remote, media, { sendAudioAsVoice : true })
    .then(() => {
        deleteFile(videoFilename);
        deleteFile(outputFilename);
    })
    .catch((err) => {
        console.error(`Error: ${err}`);
    });
  });
}

async function getVideoLength(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeKey}&fields=items(contentDetails(duration))&part=contentDetails`;

  const response = await fetch(url);
  const data = await response.json();

  // Length is returned in ISO 8601 format
  const duration = data.items[0].contentDetails.duration;
  const durationInSeconds = moment.duration(duration).asSeconds();
  return durationInSeconds;
}

async function mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage) {
  const youtubeURL = stringifyMessage[1];
  const videoID = getYoutubeVideoId(youtubeURL);
  const startTime = Number(stringifyMessage[2]);
  const endTime = Number(stringifyMessage[3]);
  const videoFilename = `audio/${videoID}.webm`; // .weba on Windows and .webm on Linux
  const outputFilename = `audio/${videoID}.ogg`;
  const commands = {
    fullVideo: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} -o "audio/%(id)s.%(ext)s"`,
    cutAtStart: `yt-dlp -v -f bestaudio -o "audio/%(id)s.%(ext)s" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${startTime}" ${stringifyMessage[1]}`,
    cutVideo: `yt-dlp -v -f bestaudio -o "audio/%(id)s.%(ext)s" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${startTime} -to ${endTime}" ${stringifyMessage[1]}`, // -t doesn't work for some reason
  };
  const command = commands[commandMode] || 'comando no válido';

  if (!youtubeURL.includes('youtube.com') && !youtubeURL.includes('youtu.be')) {
    message.reply('🤖 La URL no es válida.');
    return;
  }

  const videoLength = await getVideoLength(videoID);

  if (startTime > videoLength || endTime > videoLength) {
    message.reply('🤖 El tiempo de inicio o fin es mayor que la duración del video.');
    return;
  }

  if (startTime > endTime) {
    message.reply('🤖 El tiempo de inicio es mayor que el tiempo de fin.');
    return;
  }

  if (videoLength > 600) {
    message.reply('🤖 El video es demasiado largo. El límite es de 10 minutos.');
    return;
  }

  exec(command, (error) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    convertMp3ToOgg(videoFilename, outputFilename, message, client, MessageMedia);
  });
}

async function getRedditImage(message, subreddit, client, MessageMedia) {
  try {

    const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    if (!response.ok) {
      throw new Error(`Unable to fetch image: ${response.statusText}`);
    }

    const imageData = await response.json();
    if (!imageData) {
      throw new Error('Unable to parse image data');
    }

    const imageMedia = await MessageMedia.fromUrl(imageData.url);
    client.sendMessage(message.id.remote, imageMedia, { caption: imageData.title });

  } catch (err) {
    message.reply('🤖 Hubo un error al tratar de enviar la imagen.');
    console.error(err);
  }
}

async function getWikiArticle(message, query, languageCode, senderName, client, MessageMedia) {
  try {
    const wikipediaApiUrl = `https://${languageCode}.wikipedia.org/api/rest_v1/page/summary/${query}`;
    const apiResponse = await fetch(wikipediaApiUrl);
    const apiData = await apiResponse.json();

    const handleDisambiguation = () => {
      const disambiguationLink = apiData.content_urls.desktop.page;
      message.reply(`🤖 ${senderName}, tu búsqueda dió resultados ambiguos, puedes verlos aquí: ${disambiguationLink}`);
    }

    const handleNotFound = async () => {
      const searchApiUrl = `https://${languageCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json`;
      const searchResponse = await fetch(searchApiUrl);
      const searchData = await searchResponse.json();
      if (searchData.query.searchinfo.totalhits === 0) {
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados.`);
      } else {
        const similarArticles = searchData.query.search;
        const firstSimilarArticleTitle = similarArticles[0].title.replace(/ /g, '_');
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados, puedes ver artículos similares aquí: https://${languageCode.toLowerCase()}.wikipedia.org/wiki/${firstSimilarArticleTitle}`);
      }
    }

    const handleSuccess = async () => {
      const summary = `🤖 *${apiData.title}*: ${apiData.extract}`;
      if (apiData.originalimage) {
        const imageMedia = await MessageMedia.fromUrl(apiData.originalimage.source);
        client.sendMessage(message.id.remote, imageMedia, { caption: summary })
      } else {	
      message.reply(summary);
      }
    }

    switch (apiData.type) 
    {
      case 'disambiguation':
        handleDisambiguation();
        break;
      case 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found':
        handleNotFound();
        break;
      default:
        handleSuccess();
    }
  } catch (err) {
    console.error(err);
  }
}

async function getYoutubeInformation(message, client, MessageMedia, query, youtubeType) {
  try {
    let mediaId, baseYoutubeUrl, requiredFields, searchApiType;
    const searchApiTypes = {
      videos: 'id',
      playlists: 'id',
      channels: 'id',
      users: 'forUsername',
    }
		searchApiType = searchApiTypes[youtubeType];
    switch (youtubeType) {
      case 'videos':
        baseYoutubeUrl = 'https://youtu.be/';
        mediaId = getYoutubeVideoId(query);
				requiredFields = 'snippet%2Cstatistics%2CcontentDetails';
        break;
      case 'playlists':
        baseYoutubeUrl = 'https://www.youtube.com/playlist?list=';
        mediaId = getYoutubePlaylistId(query);
				requiredFields = 'snippet';
        break;
      case 'channels':
        baseYoutubeUrl = 'https://www.youtube.com/channel/';
        mediaId = await getYoutubeChannelId(query);
				requiredFields = 'snippet%2Cstatistics';
        break;
      case 'users':
        baseYoutubeUrl = 'https://www.youtube.com/user/';
				mediaId = await getYoutubeChannelId(query);
				
				// Check if the query contains the '@' symbol
				if (query.includes('@')) {
					searchApiType = searchApiTypes.channels;
					mediaId = mediaId.replace('@', ''); // Remove the '@' symbol
				} else {
					searchApiType = searchApiTypes[youtubeType];
				}

				youtubeType = 'channels';
				requiredFields = 'snippet%2Cstatistics';
				break;
    }
    const searchUrl = `https://www.googleapis.com/youtube/v3/${youtubeType}?part=${requiredFields}&${searchApiType}=${mediaId}&key=${youtubeKey}`;

    const response = await fetch(searchUrl);
    if (!response.ok || !mediaId) return message.reply('🤖 Houston, tenemos un problema. ¿Estás seguro de que la URL es válida?');
    const data = await response.json();
    if (data.items.length === 0) {
      return message.reply('🤖 No se han encontrado resultados. Intenta de nuevo.');
    }
    const { title, channelTitle, thumbnails } = data.items[0].snippet;
    const thumbnail = thumbnails.high.url;

		let viewCount, likeCount;
		if (data.items[0].statistics) {
			({ viewCount, likeCount } = data.items[0].statistics);
		}

    const media = await MessageMedia.fromUrl(thumbnail, { 
			unsafeMime: true,
		});

		const captionMediaYoutube = `🎬: ${title}${channelTitle ? `\n📺: ${channelTitle}` : ''}${viewCount ? `\n👀: ${viewCount} vistas` : ''}${likeCount ? `\n👍: ${likeCount} me gustas` : ''}\n🔗: ${baseYoutubeUrl}${mediaId}`;

    await client.sendMessage(message.id.remote, media, {
      caption: captionMediaYoutube,
    });
  } catch (err) {
    console.error(err);
    message.reply('🤖 Houston, tenemos un problema. Intenta de nuevo.');
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
      case 'youtube#video':
        // Send the media message for a video
        sendMediaMessage(videoId, '🎬', 'https://youtu.be/', message, client, MessageMedia);
        break;
      case 'youtube#playlist':
        // Send the media message for a playlist
        sendMediaMessage(playlistId, '🎵', 'https://www.youtube.com/playlist?list=', message, client, MessageMedia);
        break;
      case 'youtube#channel':
        // Send the media message for a channel
        sendMediaMessage(channelId, '📺', 'https://www.youtube.com/channel/', message, client, MessageMedia);
        break;
      default:
        // Handle the case when there is no video, playlist, or channel
        message.reply('🤖 No se encontró ningún video, playlist, o canal.')
        break;
    }
  } else {
    // Handle the case when there are no results
    message.reply('🤖 Hubo un error con tu búsqueda, intenta de nuevo.')
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
  const detailsUrl = `https://www.googleapis.com/youtube/v3/${emoji === '🎬' ? 'videos' : emoji === '🎵' ? 'playlists' : 'channels'}?part=snippet%2Cstatistics&id=${id}&key=${youtubeKey}`;

  // Make the request and get the JSON response
  const response = await fetch(detailsUrl);
  const data = await response.json();

  // Get the details from the response
  const { title, thumbnails, channelTitle } = data.items[0].snippet;
  const thumbnailUrl = thumbnails.high.url;
  const { viewCount, likeCount } = data.items[0].statistics;

  // Create the media message using the thumbnail URL
  const media = await MessageMedia.fromUrl(thumbnailUrl, {
    unsafeMime: true,
  });

  // Compose the caption text
  const captionText = `${emoji}: ${title}\n👤: ${channelTitle}\n👀: ${viewCount} vistas \n👍: ${likeCount} me gustas \n🔗: ${urlPrefix}${id}`;

  // Send the media message with the caption
  await client.sendMessage(message.id.remote, media, {
    caption: captionText,
  });
}

async function convertImageToSticker(chat, message, mediaSticker, senderName, senderNumber) {
  try {
    senderName = senderName.trim();
    if (!containsVisibleChars(senderName) || senderName.length < 2) {
      var match = senderNumber.match(/(^|[^])\d+/);
      senderName = `+${match[0]}, necesitas un nombre para usar stickers`;
    }
    chat.sendMessage(mediaSticker, {
      sendMediaAsSticker: true,
      stickerName: `${senderName}`,
      stickerAuthor: 'davibot',
    });
    message.reply('🤖 ¡Sticker en camino!');
  } catch (e) {
    message.reply('🤖 Hubo un error al tratar de convertir esta imagen en sticker.');
  }
}

async function convertUrlImageToSticker (chat, message, sticker, senderName, senderNumber) {
  convertImageToSticker(chat, message, sticker, senderName, senderNumber);
}

module.exports = {
  capitalizeText,
  getHelpMessage,
  getCAEMessage,
  getRedditImage,
  getWikiArticle,
  getYoutubeInformation,
  searchYoutubeVideo,
  mp3FromYoutube,
  convertImageToSticker,
  convertUrlImageToSticker,
};