/* Packages */
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const axios = require('axios').default;
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const SpotifyWebApi = require('spotify-web-api-node');

/* Define the environment variables */
const spotify_client_id = process.env.spotify_client_id;
const spotify_client_secret = process.env.spotify_client_secret;
const spotifyApi = new SpotifyWebApi({
  clientId: spotify_client_id,
  clientSecret: spotify_client_secret,
  redirectUri: 'http://localhost:3000',
});

/* Keep a timeline of the accessToken */
let accessToken = null;
let tokenExpiration = null;

// Function to refresh the access token every 30 minutes
async function refreshAccessToken() {
  // Fetch a new access token
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    accessToken = data.body['access_token'];
    tokenExpiration = data.body['expires_in'];
    console.log(`refreshAccessToken: ${accessToken} expires in ${tokenExpiration} seconds.`)
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
    // download and save audio as 'audio.mp3' with requests
    const audio2 = await axios({
      method: 'get',
      url: song.preview_url,
      responseType: 'stream',
    });

    audio2.data.pipe(fs.createWriteStream(`./audio/${song.id}.mp3`));
    return new Promise((resolve) => audio2.data.on('end', () => resolve(true)));
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

module.exports = {
  refreshAccessToken,
  getSongData,
  downloadSpotifyAudio,
  sendSpotifyAudio,
};