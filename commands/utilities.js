// This file is only available to give support to other commands
// These are not exposed on the bot

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

module.exports = {
  commandGenerator,
  convertArrayToDict,
	codeWrapper,
};