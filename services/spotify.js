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
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        accessToken = data.body["access_token"];
        spotifyApi.setAccessToken(accessToken);
        console.log("Access token refreshed successfully");
    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw error;
    }
}

async function searchSpotify(query) {
    if (!accessToken) await refreshAccessToken();

    try {
        const result = await spotifyApi.searchTracks(query, { limit: 1 });
        return result.body.tracks.items[0];
    } catch (error) {
        if (error.statusCode === 401) {
            console.log("Access token expired, refreshing...");
            await refreshAccessToken();
            const result = await spotifyApi.searchTracks(query, { limit: 1 });
            return result.body.tracks.items[0];
        } else {
            console.error("Error searching Spotify:", error);
            throw error;
        }
    }
}

async function searchFallback(query) {
    try {
        const response = await fetch(
            `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.data[0];
    } catch (error) {
        console.error("Error in fallback search:", error);
        throw error;
    }
}

async function searchAndDownloadSong(query) {
    try {
        let song = await searchSpotify(query);

        if (!song || !song.preview_url) {
            song = await searchFallback(query);
            console.log("Fallback was used");
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
    } catch (error) {
        console.error("Error in searchAndDownloadSong:", error);
        throw error;
    }
}

module.exports = { searchAndDownloadSong, refreshAccessToken };
