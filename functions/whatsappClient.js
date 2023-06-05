// Packages
const { Client, LocalAuth, MessageMedia /*, Buttons, List */ } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import commands and utility functions
const { sciHub, boTeX, lyrics, amazon, help, cae, wikipedia, reddit, utilities, stickers, docsearch, docdown, youtube, spotify } = require('../commands/index.js');
const newFunctions = require('../lib/functions/index.js');

// Import admin commands
const { groups, db, mentions, openai } = require('../commands/admin/index.js')

// Import logging utility
const logFunctionCall = require('./logFunctionCall');

// Import logging utility
let { 
  prefix, prefix_admin, robotEmoji,
  paidUsers, /*physicsUsers,*/ premiumGroups, 
  commands, adminCommands,
} = require('./globals');

// Import specific commands
const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;
// Set subreddit for the "fromis" command
const subreddit = utilities.capitalizeText(fromisCommand);

// Set function to update premium groups and users
const setFetchedData = (fetchedPaidUsers, /*fetchedPhysicsUsers,*/ fetchedPremiumGroups) => {
  paidUsers = fetchedPaidUsers;
  // physicsUsers = fetchedPhysicsUsers;
  premiumGroups = fetchedPremiumGroups;
};

// Update data when called
let refreshDataCallback;
const setRefreshDataCallback = (callback) => {
  refreshDataCallback = callback;
};

// const { MessengerDestinationPageWelcomeMessage } = require('facebook-nodejs-business-sdk');

/* 
  WhatsApp components 
*/
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: newFunctions.launchPuppeteer(),
});

client.on('qr', qr => {
  qrcode.generate(qr, {
    small: true,
  });
});
  
client.on('auth_failure', authFailureMessage => {
  console.error('Error de autenticación', authFailureMessage);
})

client.on('ready', () => {
  console.log('Estamos listos, ¡el bot está en linea!');
});

/* Commands */

client.on('message_create', async message => {

  /* Method to get the name and number of a user */
  const contactInfo = await message.getContact();
  const senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined, so we use the notifyName
  const senderNumber = message.id.participant || message.id.remote;

  /* It is important to know who and why a function was called */
  /* This also takes care of reacting if whatever function is succesfully executed */
  /* The functions variable should be generated each time, if not, it will loop through all past messages */
  const functions = {
    handleBanUserFromGroup: groups.handleBanUserFromGroup,
    handlePromoteUsersToAdmins: groups.handlePromoteUsersToAdmins,
    handleDemoteUsersToParticipants: groups.handleDemoteUsersToParticipants,
    handleJoinGroupRequest: groups.handleJoinGroupRequest,
    handleDeleteMessage: groups.handleDeleteMessage,
    handleToggleBotActivation: groups.handleToggleBotActivation,
    handleUpgradeGroupToPremium: db.handleUpgradeGroupToPremium,
    handleUpgradeUserToPremium: db.handleUpgradeUserToPremium,
    handleRefreshLocalDataFromDatabase: db.handleRefreshLocalDataFromDatabase,
    mentionEveryone: mentions.mentionEveryone,
    handleLatexToImage: boTeX.handleLatexToImage,
    searchDocuments: docsearch.searchDocuments,
    handleGoogleDriveDownloads: docdown.handleGoogleDriveDownloads,
    getHelpMessage: help.getHelpMessage,
    getAdminHelpMessage: help.getAdminHelpMessage,
    getCAEMessage: cae.getCAEMessage,
    transformMediaToSticker: stickers.transformMediaToSticker,
    handleStickerURL: stickers.handleStickerURL,
    getRedditImage: reddit.getRedditImage,
    handleWikipediaRequest: wikipedia.handleWikipediaRequest,
    handleYoutubeSearch: youtube.handleYoutubeSearch,
    handleYoutubeAudio: youtube.handleYoutubeAudio,
    handleDoiRequest: sciHub.handleDoiRequest,
    handleSearchPapersByKeywords: sciHub.handleSearchPapersByKeywords,
    handleSearchAuthor: sciHub.handleSearchAuthor,
    handleSpotifySongRequest: spotify.handleSpotifySongRequest,
    handleSongLyricsRequest: lyrics.handleSongLyricsRequest,
    handleTextToAudio: amazon.handleTextToAudio,
    handleChatWithGPT: openai.handleChatWithGPT,
    processQuotedStickerMessage: stickers.processQuotedStickerMessage,
  }

  Object.keys(functions).forEach(functionName => {
    functions[functionName] = logFunctionCall(message, functions[functionName]);
  });

  /*
  The checks are done in order of importance
  1. Check if the message is in a group
  Here there is a divergence between the admin and the regular commands
  1.a Regular: The message is in a premium group
  1.b Admin: The message is from a user who is a paid user
  */

  let chat = await message.getChat();
  if (!chat.isGroup) return;

  if (message.body.startsWith(prefix)) {
    if (!premiumGroups.some(group => group.group_id === chat.id._serialized && group.isActive)) return message.reply(`${robotEmoji} Lo siento, este grupo no está registrado. Para más información, contacta a David.`);

    /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
    let stringifyMessage = message.body.trim().split(/\s+/);

    const command = stringifyMessage[0].split(prefix)[1];

    /* Logging all messages received to Supabase */
    // supabaseCommunicationModule.insertMessage(senderNumber, message.body, message.to);

    if (!(command in commands)) return;

    /* Get all the text after the command (yt & wiki) */
    const query = message.body.split(' ').slice(1).join(' ');

    switch (command) {
      case commands.help:
        functions.getHelpMessage(prefix, stringifyMessage, helpCommand, message, /*client, List,*/ robotEmoji);
        break;
      case commands.sticker:
        functions.transformMediaToSticker(chat, message, senderName, senderNumber, robotEmoji);
        break;
      case commands.toimage:
        functions.processQuotedStickerMessage(stringifyMessage, message, chat, robotEmoji, senderName);
        break;
      case commands.url:
        functions.handleStickerURL(stringifyMessage, message, robotEmoji, reddit, chat, MessageMedia, senderName, senderNumber);
        break;
      case commands.spot:
        functions.handleSpotifySongRequest(client, message, MessageMedia, query, stringifyMessage, robotEmoji);
        break;
      case commands.letra:
        functions.handleSongLyricsRequest(stringifyMessage, message, robotEmoji)
        break;
      case commands.cae:
        functions.getCAEMessage(prefix, stringifyMessage, caeCommand, message/*, client, Buttons*/, robotEmoji);
        break;
      case commands.fromis:
        functions.getRedditImage(message, subreddit, client, MessageMedia);
        break;
      case commands.w:
        functions.handleWikipediaRequest(stringifyMessage, message, robotEmoji, query, senderName, client, MessageMedia)
        break;
      case commands.yt:
        functions.handleYoutubeSearch(stringifyMessage, message, client, MessageMedia, query, robotEmoji);
        break;
      case commands.play: {
        functions.handleYoutubeAudio(stringifyMessage, message, client, MessageMedia, robotEmoji);
        break;
      }
      case commands.say:
        functions.handleTextToAudio(stringifyMessage, message, MessageMedia, client, robotEmoji);
        break;
      case commands.doi:
        functions.handleDoiRequest(message, client, MessageMedia, stringifyMessage, robotEmoji);
        break;
      case commands.tex:
        functions.handleLatexToImage(stringifyMessage, message, client, MessageMedia, robotEmoji);
        break;
      case commands.paper:
        functions.handleSearchPapersByKeywords(stringifyMessage, message, query, robotEmoji);
        break;
      case commands.author:
        functions.handleSearchAuthor(stringifyMessage, message, query, robotEmoji);
        break;
      case commands.doc:
        functions.searchDocuments(stringifyMessage, message, query, robotEmoji)
        break;
      case commands.drive:
        functions.handleGoogleDriveDownloads(stringifyMessage, message, query, client, MessageMedia, robotEmoji)
        break;
      default:
        break;
    }

  }

  if (message.body.startsWith(prefix_admin)) {
    /*
    The logic here is the following:
    1. Check if string[1] is an actual command, this must be done because the user could send a message starting with the prefix but not being a command
    2. Check if the user is a paid user
    */

    let stringifyMessage = message.body.trim().split(/\s+/);
    const command = stringifyMessage[0].split(prefix_admin)[1];
    if (!(command in adminCommands)) return;

    if (!paidUsers.some(user => user.phone_number === senderNumber)) {
      return message.reply(`${robotEmoji} Deshabilitado. Este comando solo está disponible para usuarios premium.`);
    }

    /* Check if the sender is an admin */
    const participantsArray = Object.values(chat.participants);
    const admins = participantsArray.filter(participant => participant.isAdmin);

    const quotedMessage = await message.getQuotedMessage();
    const ownerNumber = client.info.wid.user;
    switch (command) {
      case adminCommands.help:
        functions.getAdminHelpMessage(prefix_admin, stringifyMessage, helpCommand, message, /*client, List,*/ robotEmoji);
        break;
      case adminCommands.todos:
        functions.mentionEveryone(chat, client, message, senderName);
        break;
      case adminCommands.ban:
        functions.handleBanUserFromGroup(admins, stringifyMessage, client, chat, quotedMessage, message, robotEmoji);
        break;
      case adminCommands.bot:
        functions.handleToggleBotActivation(stringifyMessage, message, chat, robotEmoji, refreshDataCallback);
        break;
      case adminCommands.del:
        functions.handleDeleteMessage(admins, stringifyMessage, message, quotedMessage, client, robotEmoji);
        break;
      case adminCommands.join:
        functions.handleJoinGroupRequest(stringifyMessage, message, client, robotEmoji);
        break;
      case adminCommands.addgroup:
        functions.handleUpgradeGroupToPremium(stringifyMessage, chat, message, refreshDataCallback, robotEmoji, senderNumber);
        break;
      case adminCommands.addpremium:
        functions.handleUpgradeUserToPremium(senderNumber, ownerNumber, quotedMessage, stringifyMessage, message, robotEmoji, prefix_admin);
        break;
      case adminCommands.refresh:
        functions.handleRefreshLocalDataFromDatabase(senderNumber, ownerNumber, stringifyMessage, message, robotEmoji, refreshDataCallback);
        break;
      case adminCommands.promote:
        functions.handlePromoteUsersToAdmins(admins, message, stringifyMessage, quotedMessage, chat, client, robotEmoji);
        break;
      case adminCommands.demote:
        functions.handleDemoteUsersToParticipants(admins, message, stringifyMessage, quotedMessage, chat, client, robotEmoji);
        break;
      case adminCommands.chat:
        functions.handleChatWithGPT(stringifyMessage, message, robotEmoji);
        break;
      default:
        break;
    }
  }

});

module.exports = {
  client,
  setFetchedData,
  setRefreshDataCallback,
}