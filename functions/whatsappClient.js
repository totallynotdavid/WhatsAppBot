// Packages
const {
    Client,
    LocalAuth,
    MessageMedia
} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import commands and utility functions
const {
    sciHub,
    boTeX,
    lyrics,
    amazon,
    help,
    cae,
    wikipedia,
    reddit,
    utilities,
    stickers,
    docsearch,
    docdown,
    youtube,
    spotify,
    editImage,
    translate,
} = require('../commands/index.js');
const { launchPuppeteer } = require('../lib/functions/index.js');

// Import admin commands
const {
    groups,
    db,
    mentions,
    openai,
    imagine,
} = require('../commands/admin/index.js');

// Import global variables
let {
    prefix,
    prefix_admin,
    robotEmoji,
    paidUsers,
    physicsUsers,
    premiumGroups,
    commands,
    adminCommands,
} = require('./globals');

// Import specific commands
const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;
// Set subreddit for the "fromis" command
const subreddit = utilities.capitalizeText(fromisCommand);

// Set function to update premium groups and users
const setFetchedData = (
    fetchedPaidUsers,
    fetchedPhysicsUsers,
    fetchedPremiumGroups,
) => {
    paidUsers = fetchedPaidUsers;
    physicsUsers = fetchedPhysicsUsers;
    premiumGroups = fetchedPremiumGroups;
};

// Update data when called
let refreshDataCallback;
const setRefreshDataCallback = (callback) => {
    refreshDataCallback = callback;
};

/*
  WhatsApp components
*/
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: launchPuppeteer(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html',
    },
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {
        small: true,
    });
});

client.on('auth_failure', (authFailureMessage) => {
    console.error('Error de autenticación', authFailureMessage);
});

client.on('ready', () => {
    console.log('Estamos listos, ¡el bot está en linea!');
    console.log(
        `Tenemos ${premiumGroups.length} grupos premium y ${paidUsers.length} usuarios premium. Los usuarios de física son ${physicsUsers.length}.`,
    );
});

/* Commands */

client.on('message_create', async (message) => {
    let [contactInfo, chat] = await Promise.all([
        message.getContact(),
        message.getChat(),
    ]);
    if (!chat.isGroup) return;

    const senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined, so we use the notifyName
    const senderNumber = message.id.participant || message.id.remote;
    const groupNumber = chat.id._serialized;

    /* Get all the text after the command (yt & wiki & chat) */
    const parts = message.body.split(' ').slice(1);
    const query = parts.join(' ');

    /*
      The checks are done in order of importance
      1. Check if the message is in a group
      Here there is a divergence between the admin and the regular commands
      1.a Regular: The message is in a premium group
      1.b Admin: The message is from a user who is a paid user
    */

    if (message.body.startsWith(prefix)) {
    // Bug: this also gets triggered if a user sends a location
        if (
            !premiumGroups.some(
                (group) => group.group_id === groupNumber && group.isActive,
            )
        )
            return;

        /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
        let stringifyMessage = message.body.trim().split(/\s+/);

        const command = stringifyMessage[0].split(prefix)[1];

        if (!(command in commands)) return;

        /* Logging all commands received to Supabase */
        // supabaseCommunicationModule.insertMessage(senderNumber, message.body, message.to, 'users');

        switch (command) {
        case commands.help:
            help.getHelpMessage(
                prefix,
                stringifyMessage,
                helpCommand,
                message,
                robotEmoji,
            );
            break;
        case commands.sticker:
            stickers.transformMediaToSticker(
                chat,
                message,
                senderName,
                senderNumber,
                robotEmoji,
            );
            break;
        case commands.toimage:
            stickers.processQuotedStickerMessage(
                stringifyMessage,
                message,
                chat,
                robotEmoji,
                senderName,
            );
            break;
        case commands.url:
            stickers.handleStickerURL(
                stringifyMessage,
                message,
                robotEmoji,
                reddit,
                chat,
                MessageMedia,
                senderName,
                senderNumber,
            );
            break;
        case commands.spot:
            spotify.handleSpotifySongRequest(
                client,
                message,
                MessageMedia,
                query,
                stringifyMessage,
                robotEmoji,
            );
            break;
        case commands.letra:
            lyrics.handleSongLyricsRequest(stringifyMessage, message, robotEmoji);
            break;
        case commands.cae:
            cae.getCAEMessage(
                prefix,
                stringifyMessage,
                caeCommand,
                message,
                robotEmoji,
            );
            break;
        case commands.fromis:
            reddit.getRedditImage(message, subreddit, client, MessageMedia);
            break;
        case commands.w:
            wikipedia.handleWikipediaRequest(
                stringifyMessage,
                message,
                robotEmoji,
                query,
                senderName,
                client,
                MessageMedia,
            );
            break;
        case commands.yt: {
            const searchResult = await youtube.searchOnYoutube(query, 'fullData');

            if (searchResult.error) {
                message.reply(searchResult.message);
            } else {
                if (searchResult.thumbnailUrl) {
                    const media = await MessageMedia.fromUrl(
                        searchResult.thumbnailUrl,
                        { unsafeMime: true },
                    );
                    client.sendMessage(message.id.remote, media, {
                        caption: searchResult.caption,
                    });
                } else {
                    message.reply(searchResult.caption);
                }
            }
            break;
        }
        case commands.play: {
            message.reply(
                `${robotEmoji} Trabajando en ello... la descarga puede tardar un poco.`,
            );
            const audioResponse = await youtube.sendYoutubeAudio(query);

            if (audioResponse.error) {
                message.reply(`${robotEmoji} ${audioResponse.message}`);
            } else {
                const media = MessageMedia.fromFilePath(audioResponse.filePath);
                client.sendMessage(message.id.remote, media, {
                    sendAudioAsVoice: true,
                });
            }
            utilities.deleteFile(audioResponse.filePath);
            break;
        }
        case commands.watch: {
            message.reply(
                `${robotEmoji} Trabajando en ello... la descarga puede tardar un poco.`,
            );
            const videoResponse = await youtube.sendYoutubeVideo(query);

            if (videoResponse.error) {
                message.reply(`${robotEmoji} ${videoResponse.message}`);
            } else {
                const isWithinLimit = await utilities.isFileSizeWithinLimit(
                    videoResponse.filePath,
                    16,
                );

                if (!isWithinLimit) {
                    message.reply(
                        `${robotEmoji} El video supera el límite de 16 MB. Prueba con otro video.`,
                    );
                } else {
                    const media = await MessageMedia.fromFilePath(
                        videoResponse.filePath,
                    );
                    client.sendMessage(message.id.remote, media);
                }
            }
            utilities.deleteFile(videoResponse.filePath);
            break;
        }
        case commands.say:
            amazon.handleTextToAudio(
                stringifyMessage,
                message,
                MessageMedia,
                client,
                robotEmoji,
            );
            break;
        case commands.doi:
            sciHub.handleDoiRequest(
                message,
                client,
                MessageMedia,
                stringifyMessage,
                robotEmoji,
            );
            break;
        case commands.tex:
            boTeX.handleLatexToImage(
                stringifyMessage,
                message,
                client,
                MessageMedia,
                robotEmoji,
            );
            break;
        case commands.paper:
            sciHub.handleSearchPapersByKeywords(
                stringifyMessage,
                message,
                query,
                robotEmoji,
            );
            break;
        case commands.author:
            sciHub.handleSearchAuthor(stringifyMessage, message, query, robotEmoji);
            break;
        case commands.doc:
            docsearch.searchDocuments(stringifyMessage, message, query, robotEmoji);
            break;
        case commands.drive:
            docdown.handleGoogleDriveDownloads(
                stringifyMessage,
                message,
                query,
                client,
                MessageMedia,
                robotEmoji,
            );
            break;
        case commands.chat:
            if (query.length <= 1) {
                message.reply(`${robotEmoji} ¿De qué quieres hablar hoy?`);
                return;
            }

            if (!(await groups.hasValidSpecialDay(groupNumber))) {
                message.reply(
                    `${robotEmoji} Deshabilitado. Este comando solo está disponible en días especiales.`,
                );
                return;
            }
            /* eslint-disable no-case-declarations */
            const chatResponse = await openai.handleChatWithGPT(
                senderNumber,
                groupNumber,
                query,
            );
            message.reply(`${robotEmoji} ${chatResponse}`);
            break;
        case commands.edit:
            editImage.handleEditImage(
                stringifyMessage,
                message,
                client,
                MessageMedia,
                robotEmoji,
            );
            break;
        case commands.t:
            const translatedMessage = await translate.translateText(query);
            message.reply(`${robotEmoji} ${translatedMessage}`);
            break;
        default:
            break;
        }

        message.react('✅');
    }

    /*
        The logic here is the following:
        1. Check if string[1] is an actual command, this must be done because the user could send a message starting with the prefix but not being a command
        2. Check if the user is a paid user
    */
    if (message.body.startsWith(prefix_admin)) {
        let stringifyMessage = message.body.trim().split(/\s+/);
        const command = stringifyMessage[0].split(prefix_admin)[1];
        if (!(command in adminCommands)) return;

        if (!paidUsers.some((user) => user.phone_number === senderNumber)) {
            return message.reply(
                `${robotEmoji} Esta función está únicamente disponible para usuarios de pago.`,
            );
        }

        /* Check if the sender is an admin of the group */
        const participantsArray = Object.values(chat.participants);
        const admins = participantsArray.filter(
            (participant) => participant.isAdmin,
        );

        const quotedMessage = await message.getQuotedMessage();
        const ownerNumber = client.info.wid.user;

        switch (command) {
        case adminCommands.help:
            help.getAdminHelpMessage(
                prefix_admin,
                stringifyMessage,
                helpCommand,
                message,
                /*client, List,*/ robotEmoji,
            );
            break;
        case adminCommands.todos:
            mentions.mentionEveryone(chat, client, message, senderName);
            break;
        case adminCommands.ban:
            groups.handleBanUserFromGroup(
                admins,
                stringifyMessage,
                client,
                chat,
                quotedMessage,
                message,
                robotEmoji,
            );
            break;
        case adminCommands.bot:
            groups.handleToggleBotActivation(
                stringifyMessage,
                message,
                chat,
                robotEmoji,
                refreshDataCallback,
            );
            break;
        case adminCommands.del:
            groups.handleDeleteMessage(
                admins,
                stringifyMessage,
                message,
                quotedMessage,
                client,
                robotEmoji,
            );
            break;
        case adminCommands.join:
            groups.handleJoinGroupRequest(
                stringifyMessage,
                message,
                client,
                robotEmoji,
            );
            break;
        case adminCommands.addgroup:
            db.handleUpgradeGroupToPremium(
                stringifyMessage,
                chat,
                message,
                refreshDataCallback,
                robotEmoji,
                senderNumber,
            );
            break;
        case adminCommands.addpremium:
            db.handleUpgradeUserToPremium(
                senderNumber,
                ownerNumber,
                quotedMessage,
                stringifyMessage,
                message,
                robotEmoji,
                prefix_admin,
            );
            break;
        case adminCommands.refresh:
            db.handleRefreshLocalDataFromDatabase(
                senderNumber,
                ownerNumber,
                stringifyMessage,
                message,
                robotEmoji,
                refreshDataCallback,
            );
            break;
        case adminCommands.promote:
            groups.handlePromoteUsersToAdmins(
                admins,
                message,
                stringifyMessage,
                quotedMessage,
                chat,
                client,
                robotEmoji,
            );
            break;
        case adminCommands.demote:
            groups.handleDemoteUsersToParticipants(
                admins,
                message,
                stringifyMessage,
                quotedMessage,
                chat,
                client,
                robotEmoji,
            );
            break;
        case adminCommands.chat:
            if (query.length > 1) {
                const chatResponse = await openai.handleChatWithGPT(
                    senderNumber,
                    groupNumber,
                    query,
                );
                message.reply(`${robotEmoji} ${chatResponse}`);
            } else {
                message.reply(`${robotEmoji} ¿De qué quieres hablar hoy?`);
            }
            break;
        case adminCommands.imagine:
            if (query.length > 4) {
                message.reply(
                    `${robotEmoji} Trabajando en ello... dame unos segundos.`,
                );
                const translatedQuery = await translate.translateText(query);
                const pathsToImages = await imagine.handleImagine(translatedQuery);
                if (pathsToImages.length === 0)
                    return message.reply(
                        `${robotEmoji} No logré generar una imagen. Contacta al desarrollador (David).`,
                    );

                pathsToImages.forEach((pathToImage) => {
                    const media = MessageMedia.fromFilePath(pathToImage);
                    client.sendMessage(message.id.remote, media);
                });
                message.reply(`${robotEmoji} ¡Terminamos, ya vienen las imágenes!`);
            } else {
                message.reply(
                    `${robotEmoji} ¿Qué quieres ver? Escribe una descripción de la imagen que quieres ver.`,
                );
            }
            break;
        default:
            break;
        }

        message.react('✅');
    }
});

module.exports = {
    client,
    setFetchedData,
    setRefreshDataCallback,
};
