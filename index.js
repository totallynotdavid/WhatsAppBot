// MAIN WORKING STRUCTURE OF THE BOT
// 0. Check all Environment Variables are set
// 1. Generate an Access Token from Spotify API
// 2. Connect to Database and load paid users
// 3. Connect to WhatsApp

/* IMPORTS */
const whatsappClient = require('./functions/whatsappClient');
const spotifyAPI = require('./lib/api/spotifyUtils.js');
const database = require('./lib/api/supabaseCommunicationModule.js');

/* CHECKING */
const { checkEnvironmentVariables } = require('./functions/checkEnvironmentVariables');
const checkStructure = require('./functions/checkStructure');
checkEnvironmentVariables(); // Check all envs are set before starting
checkStructure.checkFolderStructure();
checkStructure.cleanFolderStructure();
setInterval(checkStructure.cleanFolderStructure, 1000 * 60 * 60 * 0.1); // Clean every 15 minutes

/* SUPABASE API */
const refreshData = async () => {
  const paidUsers = await database.fetchDataFromTable('paid_users', 'phone_number');
  const physicsUsers = await database.fetchDataFromTable('physics_users', 'phone_number');
  const premiumGroups = await database.fetchDataFromTable('premium_groups', 'group_id');

  // Pass the arrays to the whatsappClient
  whatsappClient.setFetchedData(paidUsers, physicsUsers, premiumGroups);
};

refreshData();

// Refresh data at midnight
const now = new Date();
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const timeToMidnight = tomorrow - now;

setTimeout(() => {
  setInterval(refreshData, 86400000); // 24 hours
}, timeToMidnight);

/* SPOTIFY API */
spotifyAPI.refreshAccessToken();

/* WHATSAPP CLIENT */
whatsappClient.client.initialize();