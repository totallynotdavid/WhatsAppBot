// MAIN WORKING STRUCTURE OF THE BOT
// 0. Check all Environment Variables are set
// 1. Generate an Access Token from Spotify API
// 2. Connect to Database and load paid users
// 3. Connect to WhatsApp

/* IMPORTS */
const whatsappClient = require('./functions/whatsappClient');
const spotifyAPI = require('./functions/spotifyAPI');
const database = require('./database/connectToDatabase');

/* CHECKING */
const { checkEnvironmentVariables } = require('./functions/checkEnvironmentVariables');
const checkStructure = require('./functions/checkStructure');
checkEnvironmentVariables(); // Check all envs are set before starting
checkStructure.checkFolderStructure();
checkStructure.cleanFolderStructure();
setInterval(checkStructure.cleanFolderStructure, 1000 * 60 * 60 * 0.1); // Clean every 15 minutes

/* SUPABASE API */
database.loadPaidUsers().then(() => {
  // Pass the paidUsers array to the whatsappClient
  whatsappClient.setPaidUsers(database.getPaidUsers());
});
database.loadPhysicsUsers().then(() => {
	whatsappClient.setPhysicsUsers(database.getPhysicsUsers());
});
database.loadPremiumGroups().then(() => {
	whatsappClient.setPremiumGroups(database.getPremiumGroups());
});

/* SPOTIFY API */
spotifyAPI.refreshAccessToken();
setInterval(spotifyAPI.refreshAccessToken, 1000 * 60 * 30); // Refresh every 30 minutes

/* WHATSAPP CLIENT */
whatsappClient.client.initialize();