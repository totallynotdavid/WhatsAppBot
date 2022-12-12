// MAIN WORKING STRUCTURE OF THE BOT
// 0. Check all Environment Variables are set
// 1. Generate an Access Token from Spotify API
// 2. Connect to Database
// 3. Connect to WhatsApp

/* CHECKING */
const { checkEnvironmentVariables } = require('./functions/checkEnvironmentVariables');
const checkStructure = require('./functions/checkStructure');
// Check if all Environment Variables are set
checkEnvironmentVariables();
// Check if the './audio' folder exists
checkStructure.checkFolderStructure();
checkStructure.cleanFolderStructure();
// Clean the audio folder every 24 hours to avoid accumulating audio files
setInterval(checkStructure.cleanFolderStructure, 1000 * 60 * 60 * 24);

/* SPOTIFY API */
const spotifyAPI = require('./functions/spotifyAPI');
spotifyAPI.refreshAccessToken();
// Refresh the Access Token every 30 minutes to avoid it expiring
setInterval(spotifyAPI.refreshAccessToken, 1000 * 60 * 30);

/* WHATSAPP CLIENT */
const whatsappClient = require('./functions/whatsappClient');
whatsappClient.initialize();