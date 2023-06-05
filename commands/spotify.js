/* Packages */
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const spotifyWebApi = require('spotify-web-api-node');

/* Define the environment variables */
const { spotify_client_id, spotify_client_secret } = process.env;
const spotifyApi = new spotifyWebApi({
  clientId: spotify_client_id,
  clientSecret: spotify_client_secret,
  redirectUri: 'http://localhost:3000',
});

/* Keep a timeline of the accessToken */
let accessToken = null;

async function refreshAccessToken() {
  // Fetch a new access token
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    accessToken = data.body['access_token'];
  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
}

// Function to get the song data from the Spotify API
async function getSongData(url) {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json();
    return data.tracks.items[0];
  } catch (error) {
    console.error('Error getting song data:', error);
    return null;
  }
}

// Function to download and save the audio file
async function downloadSpotifyAudio(song) {
  try {
    const audioStream = await fetch(song.preview_url);
    const fileWriter = fs.createWriteStream(`./audio/${song.id}.mp3`);
    audioStream.body.pipe(fileWriter);
    return new Promise((resolve) => fileWriter.on('finish', () => resolve(true)));
  } catch (error) {
    console.error('Error downloading audio file:', error);
    return false;
  }
}

// Function to send the audio file to the user
async function sendSpotifyAudio(MessageMedia, client, message, song, robotEmoji) {
  try {
    const media = MessageMedia.fromFilePath(`./audio/${song.id}.mp3`);
    await client.sendMessage(message.id.remote, media, { sendAudioAsVoice: true });
  } catch (error) {
    console.error('Error sending audio file:', error);
    message.reply(`${robotEmoji} Houston, tenemos un problema. No se pudo enviar el audio.`)
    return null;
  }
}

async function handleSpotifySongRequest(client, message, MessageMedia, query, stringifyMessage, robotEmoji) {
  const song = await getSongData(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`);

  if (stringifyMessage.length === 1) {
    message.reply(`${robotEmoji} Cómo te atreves a pedirme una canción sin decirme el nombre.`);
  } else {
    const audioDownloaded = await downloadSpotifyAudio(song);

    if (audioDownloaded) {
      await sendSpotifyAudio(MessageMedia, client, message, song, robotEmoji);
    } else {
      message.reply(`${robotEmoji} Houston, tenemos un problema. Intenta de nuevo.`);
    }
  }
}

module.exports = {
  refreshAccessToken,
  handleSpotifySongRequest,
};