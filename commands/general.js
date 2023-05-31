/* Packages */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const moment = require('moment');
const { exec } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const youtube_api_key = process.env.youtube_api_key;

const utilities = require('./utilities');

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
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data;
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
        utilities.deleteFile(videoFilename);
        utilities.deleteFile(outputFilename);
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

    const captionMediaYoutube = `🎬: ${title}${channelTitle ? `\n📺: ${channelTitle}` : ''}${viewCount ? `\n👀: ${utilities.formatNumber(viewCount)} vistas` : ''}${likeCount ? `\n👍: ${utilities.formatNumber(likeCount)} me gustas` : ''}\n🔗: ${baseYoutubeUrl}${mediaId}`;

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

  const captionText = `🎬: ${title}${channelTitle ? `\n👤: ${channelTitle}` : ''}${viewCount ? `\n👀: ${utilities.formatNumber(viewCount)} vistas` : ''}${likeCount ? `\n👍: ${utilities.formatNumber(likeCount)} me gustas` : ''}\n🔗: ${urlPrefix}${id}`;

  await client.sendMessage(message.id.remote, media, { 
		caption: captionText,
	});
}

/*
 * These functions are used by the sticker and url commands to validate and convert the media
*/

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

async function convertImageToSticker(chat, message, mediaSticker, senderName, senderNumber) {
  try {
    senderName = senderName.trim();
    if (!utilities.containsVisibleChars(senderName) || senderName.length < 2) {
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
  getYoutubeInformation,
  searchYoutubeVideo,
  mp3FromYoutube,
  convertImageToSticker,
  convertUrlImageToSticker,
	validateAndConvertMedia,
};