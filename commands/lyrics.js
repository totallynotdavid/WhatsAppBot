require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');

async function fetchSongLyrics(message) {
	try {
			const apiKey = process.env.MUSIXMATCH_API_KEY;
			let url = `https://api.musixmatch.com/ws/1.1/track.search?format=json&callback=callback&q_track=${message}&apikey=${apiKey}`;

			console.log(url)

			let response = await axios.get(url);
			let trackList = response.data.message.body.track_list;

			if (!trackList || trackList.length === 0) {
					url = `https://api.musixmatch.com/ws/1.1/track.search?format=json&callback=callback&q_lyrics=${message}&apikey=${apiKey}`;

					console.log(url)

					response = await axios.get(url);
					trackList = response.data.message.body.track_list;
			}

			if (trackList && trackList.length > 0) {
					const trackId = trackList[0].track.track_id;
					const lyricsResponse = await axios.get(`https://api.musixmatch.com/ws/1.1/track.lyrics.get?format=json&callback=callback&track_id=${trackId}&apikey=${apiKey}`);

					console.log(`https://api.musixmatch.com/ws/1.1/track.lyrics.get?format=json&callback=callback&track_id=${trackId}&apikey=${apiKey}`)

					const lyrics = lyricsResponse.data.message.body.lyrics.lyrics_body;
					return lyrics;
			}

			return 'No se encontraron letras para esta canción.';
	} catch (error) {
			console.error(`Could not fetch lyrics: ${error}`);
			return 'Hubo un error al buscar las letras de la canción.';
	}
}

module.exports = {
	fetchSongLyrics,
};