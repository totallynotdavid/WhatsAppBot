const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// fromis command
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

// url (sticker) command
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

module.exports = {
	getRedditImage,
	getRedditVideo,
	saveRedditVideo,
	handleRedditMedia,
};