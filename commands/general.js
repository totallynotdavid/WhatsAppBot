/* Packages */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios').default;
const moment = require('moment');
const { exec } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const youtube_api_key = process.env.youtube_api_key;

/* Commands stored as JSON files for better readability */
const helpListCommands = require('../fixedData/helpListCommands.json');
const CAEListCommands = require('../fixedData/CAEListCommands.json');

function codeWrapper(message) {
  return '```' + message + '```';
}

function commandGenerator(fixedDataCommand, message, stringifyMessage, prefix, robotEmoji) {
  try {
    let commandFound = false;

    for (const command of fixedDataCommand) {
      if (command.command === stringifyMessage[1]) {
        commandFound = true;
        const builtMessage = `${robotEmoji} ${command.message}. Ejemplo de uso:\n\n${prefix}${command.usage}`;
        message.reply(builtMessage);
        break;
      }
    }

    if (!commandFound) {
      message.reply(`${robotEmoji} Parece que ${codeWrapper(stringifyMessage[1])} no existe.`);
    }
  } catch (err) {
    console.error(err);
  }
}

function capitalizeText(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

function formatNumber(number) {
  const parts = [];
  let str = number.toString();
  while (str.length > 3) {
    parts.unshift(str.slice(-3));
    str = str.slice(0, -3);
  }
  if (str.length > 0) {
    parts.unshift(str);
  }
  return parts.join(' ');
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

function getHelpMessage(prefix, stringifyMessage, helpCommand, message, /*client, List,*/ robotEmoji) {
  try {
    switch (stringifyMessage.length) {
      case 1:
        sendHelpList(prefix, helpCommand, message, /*client, List,*/ robotEmoji);
        break;
      case 2:
        commandGenerator(helpListCommands, message, stringifyMessage, prefix, robotEmoji);
        break;
      default:
        message.reply(`🤖 Este comando no es válido. Usa ${prefix}${helpCommand} para ver los comandos disponibles.`);
    }

  } catch (err) {
    console.error(err);
  }
}

function sendHelpList(prefix, helpCommand, message, /*client, List,*/ robotEmoji) {
  try {
		const commands = helpListCommands.map(command => `${prefix}${command.command}`);
		/*
    const helpList = new List(
      `${robotEmoji} Buh, soy un bot sin habilidades telepáticas... nah. ¿O quizá sí?`,
      'Cómo usar los comandos',
      [
        {
          title: `Usa "${prefix}${helpCommand} <comando>" para más detalles sobre un comando`,
          rows: examples.map(example => ({title: example})),
        },
    ]);
    client.sendMessage(message.id.remote, helpList);
		*/
		message.reply(`${robotEmoji} Aquí tienes la lista de comandos disponibles:\n\n${codeWrapper(commands.join('\n'))}\n\nSi necesitas más información sobre un comando en particular, escribe: ${codeWrapper(`${prefix}${helpCommand} <comando>`)}`);
  } catch (err) {
    console.error(err);
  }
}

function getCAEMessage(prefix, stringifyMessage, caeCommand, message/*, client, Buttons*/) {
  try {
    //let buttonsMessage; // For now, we can't send buttons messages
		const physicsResourcesMessage = '🔗 Recursos recomendados: https://linktr.ee/caefisica\n📚 BiblioteCAE: https://bit.ly/cae_biblioteca\n📄 Guías de Estudio: https://bit.ly/41EN8CH';

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
				message.reply(`🤖 ¡Aquí tienes algunos recursos adicionales para ayudarte en el estudio de la Física!\n\n${codeWrapper(physicsResourcesMessage)}\n\nProporcionado por el equipo del CAE-Física`);
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

  if (youtubeRegex.test(url)) {
    return url.match(youtubeRegex)[1];
  }
  return null;
}

function validateParams(youtubeURL, startTime, endTime, videoLength) {
  if (!youtubeURL || (!youtubeURL.includes('youtube.com') && !youtubeURL.includes('youtu.be'))) {
    return '🤖 La URL no es válida.';
  }
  if (startTime > videoLength || endTime > videoLength) {
    return '🤖 El tiempo de inicio o fin es mayor que la duración del video.';
  }
  if (startTime > endTime) {
    return '🤖 El tiempo de inicio es mayor que el tiempo de fin.';
  }
  if (videoLength > 600) {
    return '🤖 El video es demasiado largo. El límite es de 10 minutos.';
  }
  return null;
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
  } else {
    match = usernameRegex.exec(url);
    if (match) {
			const preChannelId = match[1];
			channelId = await getChannel(preChannelId);
			console.log(`Channel ID (custom): ${channelId}`);
		} else {
			throw new Error('Invalid YouTube URL');
		}
	}

  return channelId;
}

async function getChannel(username) {
  const baseUrl = 'https://www.googleapis.com/youtube/v3/';
  try {
    const searchResults = await fetchData(`${baseUrl}search?key=${youtube_api_key}&part=snippet&q=${username}&maxResults=50&order=relevance&type=channel`);
    const channelIds = searchResults.items.map(item => item.id.channelId);
    const channelDetails = await fetchData(`${baseUrl}channels?key=${youtube_api_key}&part=snippet&id=${channelIds.join(',')}&maxResults=50`);
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
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtube_api_key}&fields=items(contentDetails(duration))&part=contentDetails`;

  const response = await fetch(url);
  const data = await response.json();

  // Length is returned in ISO 8601 format
  const duration = data.items[0].contentDetails.duration;
  const durationInSeconds = moment.duration(duration).asSeconds();
  return durationInSeconds;
}

async function mp3FromYoutube(commandMode, message, client, MessageMedia, stringifyMessage, robotEmoji) {
  const youtubeURL = stringifyMessage[1];
  const videoID = getYoutubeVideoId(youtubeURL);
  const startTime = Number(stringifyMessage[2]);
  const endTime = Number(stringifyMessage[3]);
  const outputFilename = `audio/${videoID}.ogg`;
  const commands = {
    fullVideo: `yt-dlp -v -f bestaudio ${stringifyMessage[1]} -o "audio/%(id)s.%(ext)s"`,
    cutAtStart: `yt-dlp -v -f bestaudio -o "audio/%(id)s.%(ext)s" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${startTime}" ${stringifyMessage[1]}`,
    cutVideo: `yt-dlp -v -f bestaudio -o "audio/%(id)s.%(ext)s" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${startTime} -to ${endTime}" ${stringifyMessage[1]}`, // -t doesn't work for some reason
  };
  
	const command = commands[commandMode];

  if (!command) {
    message.reply(`${robotEmoji} Comando no válido.`);
    return;
  }

	if (!videoID) {
    message.reply(`${robotEmoji} La URL no es válida.`);
    return;
  }

	const videoLength = await getVideoLength(videoID);
	const validationResult = validateParams(youtubeURL, startTime, endTime, videoLength);

  if (validationResult) {
    message.reply(validationResult);
    return;
  }

  exec(command, (error, stdout) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }

		const videoFilename = getVideoFilename(stdout);

    convertMp3ToOgg(videoFilename, outputFilename, message, client, MessageMedia);
  });
}

function getVideoFilename(stdout) {
	// We look for the line that contains the video filename in the stdout (output of the command)
  const regex = /Destination: (audio[/\\](.{11})\.(webm|m4a|mp3))/;
  const match = stdout.match(regex);
  return match ? match[1] : null;
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

async function getRedditVideo(media) {
  const baseUrl = media.secure_media.reddit_video.fallback_url;
  const cases = [1080, 720, 480, 360, 240, 220];
  const videoTitle = media.title.replace(/[^a-zA-Z0-9]/g, '_') + '.mp4';

  for (const c of cases) {
    const response = await fetch(`${baseUrl}/DASH_${c}.mp4`);
    if (response.status != 200) { continue; }

    const fileStream = fs.createWriteStream(path.join(__dirname, videoTitle));
    response.body.pipe(fileStream);
    fileStream.on('error', (error) => {
      console.error('Error while saving the file:', error);
    });
    fileStream.on('finish', () => {
      console.log('Video file saved:', videoTitle);
    });
    break;
  }
}

async function handleRedditMedia(stickerURL, message, robotEmoji) {
  try {
    const postURL = stickerURL.replace(/\/$/, '') + '.json';
    const response = await fetch(postURL);
    const postData = await response.json();

    const media = postData[0].data.children[0].data;

    let mediaURL;

    if (media.is_video) {
      mediaURL = media.secure_media.reddit_video.fallback_url;
      const localFilePath = await saveRedditVideo(media);
      return {
        mediaURL: mediaURL,
        media: media,
        localFilePath: localFilePath,
      };
    } else if (media.url.startsWith('https://v.redd.it/') || media.url.startsWith('https://i.imgur.com/')) {
			mediaURL = media.url;
		} else if (media.preview && media.preview.images && media.preview.images.length > 0) {
			mediaURL = media.preview.images[0].source.url.replace(/&amp;/g, '&');
    } else if (media.url) {
      mediaURL = media.url;
    } else {
      message.reply(`${robotEmoji} URL inválida, por favor verifica y vuelve a enviarlo. Solo se aceptan imágenes y videos.`);
      return {
        mediaURL: mediaURL,
        media: media,
      };
    }
    return {
      mediaURL: mediaURL,
      media: media,
    };
  } catch (error) {
    console.error(error);
    message.reply(`${robotEmoji} Parece que algo salió mal, intenta de nuevo.`);
    return null;
  }
}

async function saveRedditVideo(media) {
  try {
    if (!media.secure_media || !media.secure_media.reddit_video) {
      throw new Error('Reddit video not found');
    }
    const videoURL = media.secure_media.reddit_video.fallback_url;
    const videoResponse = await fetch(videoURL);
    const videoBuffer = await videoResponse.buffer();
    const videoId = media.id;
    const videoPath = path.join(__dirname, '..', 'video', `${videoId}.mp4`);
    fs.writeFileSync(videoPath, videoBuffer);
    return videoPath;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function validateAndConvertMedia(chat, mediaURL, message, MessageMedia, senderName, senderNumber, robotEmoji, localFilePath = null) {
	try {
		if (mediaURL.endsWith('.gifv')) {
			mediaURL = mediaURL.replace(/\.gifv$/i, '.mp4');
		}

    const response = await fetch(mediaURL);
    const [contentType, contentLength] = (response.headers.get('content-type') || '').split(';');

    if (response.ok && contentType && (contentType.startsWith('image/') || contentType.startsWith('video/'))) {
      if (contentType.startsWith('video/mp4') && contentLength && parseInt(contentLength.split('=')[1]) > 20 * 1000) {
        message.reply(`${robotEmoji} Necesitas premium para enviar videos de más de 20 segundos.`);
      } else {
        let sticker;
        if (localFilePath) {
          sticker = await MessageMedia.fromFilePath(localFilePath);
        } else {
          sticker = await MessageMedia.fromUrl(mediaURL);
        }
        convertUrlImageToSticker(chat, message, sticker, senderName, senderNumber);
      }
    } else {
      message.reply(`${robotEmoji} Esa URL no es hacia el corazón de ella, ni siquiera es una imagen o video. Intenta de nuevo.`);
    }
  } catch (error) {
    console.error(error);
    message.reply(`${robotEmoji} Parece que algo salió mal, intenta de nuevo.`);
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

async function fetchYoutubeData(url) {
  const response = await fetch(url);
  const data = await response.json();

  const { title, thumbnails, channelTitle } = data.items[0].snippet;
  const thumbnailUrl = thumbnails.high.url;
  let viewCount, likeCount;

  if (data.items[0].statistics) {
    ({ viewCount, likeCount } = data.items[0].statistics);
  }

  return { title, thumbnailUrl, channelTitle, viewCount, likeCount };
}

async function getYoutubeInformation(message, client, MessageMedia, query, youtubeType) {
  try {
    let mediaId, baseYoutubeUrl, requiredFields, searchApiType;
    const searchApiTypes = {
      videos: 'id',
      playlists: 'id',
      channels: 'id',
      users: 'forUsername',
    };
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

        if (query.includes('@')) {
          searchApiType = searchApiTypes.channels;
          mediaId = mediaId.replace('@', '');
        } else {
          searchApiType = searchApiTypes[youtubeType];
        }

        youtubeType = 'channels';
        requiredFields = 'snippet%2Cstatistics';
        break;
    }
    const searchUrl = `https://www.googleapis.com/youtube/v3/${youtubeType}?part=${requiredFields}&${searchApiType}=${mediaId}&key=${youtube_api_key}`;

    if (!mediaId) return message.reply('🤖 Houston, tenemos un problema. ¿Estás seguro de que la URL es válida?');

    const { title, thumbnailUrl, channelTitle, viewCount, likeCount } = await fetchYoutubeData(searchUrl);

    if (!title) {
      return message.reply('🤖 No se han encontrado resultados. Intenta de nuevo.');
    }

    const media = await MessageMedia.fromUrl(thumbnailUrl, { unsafeMime: true });

    const captionMediaYoutube = `🎬: ${title}${channelTitle ? `\n📺: ${channelTitle}` : ''}${viewCount ? `\n👀: ${formatNumber(viewCount)} vistas` : ''}${likeCount ? `\n👍: ${formatNumber(likeCount)} me gustas` : ''}\n🔗: ${baseYoutubeUrl}${mediaId}`;

    await client.sendMessage(message.id.remote, media, { caption: captionMediaYoutube });
  } catch (err) {
    console.error(err);
    message.reply('🤖 Houston, tenemos un problema. Intenta de nuevo.');
  }
}

async function searchYoutubeVideo(message, client, MessageMedia, query) {
  // Build the search URL with the query and youtube_api_key
  const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&key=${youtube_api_key}`;

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
  const detailsUrl = `https://www.googleapis.com/youtube/v3/${emoji === '🎬' ? 'videos' : emoji === '🎵' ? 'playlists' : 'channels'}?part=snippet%2Cstatistics&id=${id}&key=${youtube_api_key}`;

  const { title, thumbnailUrl, channelTitle, viewCount, likeCount } = await fetchYoutubeData(detailsUrl);

  const media = await MessageMedia.fromUrl(thumbnailUrl, { 
		unsafeMime: true,
	});

  const captionText = `🎬: ${title}${channelTitle ? `\n👤: ${channelTitle}` : ''}${viewCount ? `\n👀: ${formatNumber(viewCount)} vistas` : ''}${likeCount ? `\n👍: ${formatNumber(likeCount)} me gustas` : ''}\n🔗: ${urlPrefix}${id}`;

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
	getRedditVideo,
	handleRedditMedia,
	validateAndConvertMedia,
	saveRedditVideo,
};