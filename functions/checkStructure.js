const fs = require('fs');
const { readdirSync, rmSync } = require('fs');

// IMPORTANT: Use ./audio instead of ../audio because the index.js file is in the root folder
// Don't see this as relative to this file, but to the index.js file
let audioDirectory = './audio';

function checkFolderStructure() {
  // Check if the './audio' folder exists
  if (!fs.existsSync(audioDirectory)) {
    fs.mkdirSync(audioDirectory);
    console.log(`Created [${audioDirectory}] folder because there was none. This is to store the audio files.`);
  }
}

function cleanFolderStructure() {
  try {
    readdirSync(audioDirectory).forEach(f => rmSync(`${audioDirectory}/${f}`));
    console.log(`Cleaned [${audioDirectory}] folder. This is to avoid accumulating audio files.`)
  } catch (error) {
    console.error('Error cleaning audio folder:', error);
  }
}

module.exports = {
  checkFolderStructure,
  cleanFolderStructure,
};