/* This runs when spotifyAPI is called */
const dotenv = require('dotenv');

function checkEnvironmentVariables() {
  // Check if the dotenv package is installed and the .env file exists
  if (dotenv.config().error) {
    throw new Error('The dotenv package is not installed or the .env file does not exist');
  }

  // Define the required environment variables
  const requiredVariables = ['spotify_client_id', 'spotify_client_secret', 'youtube_api_key', 'supabase_api_key', 'supabase_base_url', 'folder_id', 'facebook_access_token', 'facebookId', 'adminNumber', 'NODE_ENV', 'MUSIXMATCH_API_KEY', 'OPENAI_API_KEY'];

  // Check if all of the required environment variables are defined in the .env file
  for (const variable of requiredVariables) {
    if (!process.env[variable]) {
      throw new Error('One or more required environment variables are missing from the .env file');
    }
  }
}

module.exports = {
  checkEnvironmentVariables,
};