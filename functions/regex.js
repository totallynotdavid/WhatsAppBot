// Used when converting external media to stickers. GIFs are not supported because they are not animated stickers
const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.%]+(\.(jpg|jpeg|gifv|png|mp4))$/;
const imageOrVideoRegex = /\.(jpg|jpeg|gifv|png|mp4)$/i;
const websiteAllowedRegex = /^https?:\/\/(?:www\.)?reddit\.com\/r\/[\w-]+\/comments\/[\w-]+\/[\w-]+\/?$/i;

// Types of youtube links
const youtubeTypes = {
	videos: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)(\/watch\?v=|\/)([A-Za-z0-9-_]{11}).*$/,
	users: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(user\/|c\/|@)?[A-Za-z0-9-_]+$/,
  channels: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/channel\/[A-Za-z0-9-_]+$/,
  playlists: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/playlist\?list=[A-Za-z0-9-_]+$/,
  search: null,
}

module.exports = {
	urlRegex,
	imageOrVideoRegex,
	websiteAllowedRegex,
	youtubeTypes,
};