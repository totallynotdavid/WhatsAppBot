// This file is only available to give support to other commands
// These are not exposed on the bot
const fs = require('fs').promises;

function capitalizeText(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function codeWrapper(message) {
  return '```' + message + '```';
}

function convertArrayToDict(commandArray) {
  return commandArray.reduce((dict, commandObj) => {
    dict[commandObj.command] = commandObj;
    return dict;
  }, {});
}

function commandGenerator(fixedDataCommandDict, message, stringifyMessage, prefix, robotEmoji) {
  try {
    const commandObj = fixedDataCommandDict[stringifyMessage[1]];

    if (commandObj) {
      const builtMessage = commandObj.usage
        ? `${robotEmoji} ${commandObj.message}.\n\n*Ejemplo de uso*:\n\n${codeWrapper(`${prefix}${commandObj.usage}`)}`
        : `${robotEmoji} ${commandObj.message}.`;

      message.reply(builtMessage);
    } else {
      message.reply(`${robotEmoji} Parece que ${codeWrapper(stringifyMessage[1])} no existe.`);
    }
  } catch (err) {
    console.error(err);
  }
}

function hasNonWhitespace(str) {
  return /[^ \t\n\r\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/.test(str);
}

function containsVisibleChars(str) {
  // Check if the string contains any alphanumeric or non-whitespace character
  return /[a-zA-Z0-9]/.test(str) && hasNonWhitespace(str);
}

// used to format numbers with spaces
function formatNumber(number) {
  const parts = [];
  let str = number.toString();
  while (str.length > 3) {
    parts.unshift(str.slice(-3));
    str = str.slice(0, -3);
  }
  if (str.length > 0) {
    parts.unshift(str);
  }
  return parts.join(' ');
}

function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${err}`);
    } else {
      console.log(`File ${filePath} deleted successfully`);
    }
  });
}

module.exports = {
  capitalizeText,
  commandGenerator,
  convertArrayToDict,
  codeWrapper,
  containsVisibleChars,
  formatNumber,
  deleteFile,
};