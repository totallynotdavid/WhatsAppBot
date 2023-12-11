const path = require("path");
const { exec } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { robotEmoji } = require("../functions/globals");
const fetchYoutubeMetadata = require("yt_metadata");
const utilities = require("./utilities");
const { getVideoLength } = require("yt_duration")

// Search on Youtube
async function searchOnYoutube(query, mode) {
  try {
    const media_metadata = await fetchYoutubeMetadata(query, mode);
    let caption;

    if (!media_metadata || Object.keys(media_metadata).length === 0) {
      return {
        error: true,
        message: `${robotEmoji} Houston, tenemos un problema. No se pudo encontrar el video.`,
      };
    }

    const {
      thumbnailUrl,
      title,
      channelTitle,
      viewCount,
      likeCount,
      mediaType,
      mediaId,
    } = media_metadata;

    let baseYoutubeUrl;
    switch (mediaType) {
      case "video":
        baseYoutubeUrl = `https://youtu.be/${mediaId}`;
        caption = `🎬: ${title}\n📺: ${channelTitle}${
          viewCount ? `\n👀: ${utilities.formatNumber(viewCount)} vistas` : ""
        }${
          likeCount
            ? `\n👍: ${utilities.formatNumber(likeCount)} me gustas`
            : ""
        }\n🔗: ${baseYoutubeUrl}`;
        break;
      case "playlist":
        baseYoutubeUrl = `https://www.youtube.com/playlist?list=${mediaId}`;
        caption = `🎬: ${title}\n🔗: ${baseYoutubeUrl}`;
        break;
      case "channel":
        baseYoutubeUrl = `https://www.youtube.com/channel/${mediaId}`;
        caption = `📺: ${channelTitle}\n🔗: ${baseYoutubeUrl}`;
        break;
      default:
        return {
          error: true,
          message: `${robotEmoji} Tipo de medio no reconocido. No se pudo procesar el video.`,
        };
    }

    return { error: false, thumbnailUrl, caption };
  } catch (error) {
    console.error(`Error in searchOnYoutube: ${error.message}`);
    return {
      error: true,
      message: `${robotEmoji} Hubo un problema al procesar el comando.`,
    };
  }
}

async function sendYoutubeAudio(youtubeURL, robotEmoji) {
  try {
    const media_metadata = await fetchYoutubeMetadata(youtubeURL, "idOnly");

    if (!media_metadata || !media_metadata.mediaId) {
      return { error: true, message: `${robotEmoji} La URL no es válida.` };
    }

    const videoID = media_metadata.mediaId;
    const videoLength = await getVideoLength(videoID, "seconds");

    if (videoLength > 600) {
      // 600 seconds = 10 minutes
      return {
        error: true,
        message: `${robotEmoji} El video es más largo de 10 minutos.`,
      };
    }

    const downloadCommand = `yt-dlp -v -f bestaudio https://youtu.be/${videoID} -o "audio/%(id)s.%(ext)s"`;
    const downloadStdout = await execCommand(downloadCommand).catch((error) => {
      if (
        error.stderr &&
        error.stderr.includes("Video unavailable. This video contains content")
      ) {
        throw new Error(
          `${robotEmoji} Lo siento, este video está restringido en la ubicación del servidor (USA).`,
        );
      } else {
        throw new Error(
          `${robotEmoji} Houston, tenemos un problema. ¿Intenta de nuevo?`,
        );
      }
    });
    const downloadedFilename = getVideoFilename(downloadStdout);

    if (!downloadedFilename) {
      return {
        error: true,
        message: `${robotEmoji} No se pudo descargar el audio.`,
      };
    }

    const oggFilename = `audio/${videoID}.ogg`;
    const convertCommand = `ffmpeg -i "${downloadedFilename}" -c:a libopus "${oggFilename}"`;
    await execCommand(convertCommand);

    utilities.deleteFile(downloadedFilename);

    return { error: false, filePath: oggFilename };
  } catch (error) {
    console.error(`Error in sendYoutubeAudio: ${error.message}`);
    return { error: true, message: error.message };
  }
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error}`);
        return reject({ error, stdout, stderr });
      }
      resolve(stdout);
    });
  });
}

function getVideoFilename(stdout) {
  const regex = /Destination: (audio[/\\](.{11})\.(webm|m4a|mp3))/;
  const match = stdout.match(regex);
  return match ? match[1] : null;
}

module.exports = {
  searchOnYoutube,
  sendYoutubeAudio,
};
