const SpotifyWebApi = require("spotify-web-api-node");
const fetch = require("node-fetch");
const path = require("path");
const audioService = require("./audio");

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `http://localhost:3000`,
});

let accessToken = null;

async function refreshAccessToken() {
    const data = await spotifyApi.clientCredentialsGrant();
    accessToken = data.body["access_token"];
    spotifyApi.setAccessToken(accessToken);
}

async function searchSpotify(query) {
    if (!accessToken) await refreshAccessToken();
    const result = await spotifyApi.searchTracks(query, { limit: 1 });
    return result.body.tracks.items[0];
}

async function searchFallback(query) {
    const response = await fetch(
        `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.data[0];
}

async function searchAndDownloadSong(query) {
    let song = await searchSpotify(query);

    if (!song || !song.preview_url) {
        song = await searchFallback(query);
        console.log('Fallback was used');
    }

    if (!song) return null;

    const previewUrl = song.preview_url || song.preview;
    if (!previewUrl) return null;

    const fileName = `${song.id || song.title.replace(/\s+/g, "_")}.mp3`;
    const filePath = path.join(__dirname, "..", "audio", fileName);
    await audioService.downloadAudio(previewUrl, filePath);

    return {
        name: song.name || song.title,
        artist: song.artists?.[0].name || song.artist.name,
        filePath,
    };
}

module.exports = { searchAndDownloadSong, refreshAccessToken };
