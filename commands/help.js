const {
    commandGenerator,
    convertArrayToDict,
    codeWrapper,
} = require('./utilities.js');

const helpListCommands = require('../data/helpListCommands.json');
const helpListCommandsDict = convertArrayToDict(helpListCommands);

const helpAdminListCommands = require('../data/helpAdminListCommands.json');
const helpAdminListCommandsDict = convertArrayToDict(helpAdminListCommands);

// User commands

function getHelpMessage(
    prefix,
    stringifyMessage,
    helpCommand,
    message,
    /*client, List,*/ robotEmoji,
) {
    try {
        switch (stringifyMessage.length) {
        case 1:
            sendHelpList(
                prefix,
                helpCommand,
                message,
                /*client, List,*/ robotEmoji,
            );
            break;
        case 2:
            commandGenerator(
                helpListCommandsDict,
                message,
                stringifyMessage,
                prefix,
                robotEmoji,
            );
            break;
        default:
            message.reply(
                `🤖 Este comando no es válido. Usa ${prefix}${helpCommand} para ver los comandos disponibles.`,
            );
        }
    } catch (err) {
        console.error(err);
    }
}

function sendHelpList(
    prefix,
    helpCommand,
    message,
    /*client, List,*/ robotEmoji,
) {
    try {
        const commands = helpListCommands.map(
            (command) => `${prefix}${command.command}`,
        );
        /*
    const helpList = new List(
      `${robotEmoji} Buh, soy un bot sin habilidades telepáticas... nah. ¿O quizá sí?`,
      'Cómo usar los comandos',
      [
        {
          title: `Usa "${prefix}${helpCommand} <comando>" para más detalles sobre un comando`,
          rows: examples.map(example => ({title: example})),
        },
    ]);
    client.sendMessage(message.id.remote, helpList);
    */
        message.reply(
            `${robotEmoji} Aquí tienes la lista de comandos disponibles:\n\n${codeWrapper(
                commands.join('\n'),
            )}\n\nSi necesitas más información sobre un comando en particular, escribe: ${codeWrapper(
                `${prefix}${helpCommand} <comando>`,
            )} (sin los símbolos <>).`,
        );
    } catch (err) {
        console.error(err);
    }
}

// Admin commands

function getAdminHelpMessage(
    prefix,
    stringifyMessage,
    helpCommand,
    message,
    /*client, List,*/ robotEmoji,
) {
    try {
        switch (stringifyMessage.length) {
        case 1:
            sendAdminHelpList(
                prefix,
                helpCommand,
                message,
                /*client, List,*/ robotEmoji,
            );
            break;
        case 2:
            commandGenerator(
                helpAdminListCommandsDict,
                message,
                stringifyMessage,
                prefix,
                robotEmoji,
            );
            break;
        default:
            message.reply(
                `🤖 Este comando no es válido. Usa ${prefix}${helpCommand} para ver los comandos disponibles.`,
            );
        }
    } catch (err) {
        console.error(err);
    }
}

function sendAdminHelpList(
    prefix,
    helpCommand,
    message,
    /*client, List,*/ robotEmoji,
) {
    try {
        const commands = helpAdminListCommands.map(
            (command) => `${prefix}${command.command}`,
        );
        message.reply(
            `${robotEmoji} Aquí tienes la lista de comandos de administración disponibles:\n\n${codeWrapper(
                commands.join('\n'),
            )}\n\nSi necesitas más información sobre un comando en particular, escribe: ${codeWrapper(
                `${prefix}${helpCommand} <comando>`,
            )} (sin los símbolos <>).`,
        );
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    getHelpMessage,
    getAdminHelpMessage,
};
