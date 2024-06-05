const { Client, LocalAuth, MessageMedia } = require(`whatsapp-web.js`);
const qrcode = require(`qrcode-terminal`);
const supabaseCommunicationModule = require(
    `../lib/api/supabaseCommunicationModule.js`
);

// Import commands and utility functions
const {
    sciHub,
    semanticScholar,
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
} = require(`../commands/index.js`);
const { handleContactRequest } = require(`../lib/handlers/contactHandler.js`);
const { launchPuppeteer } = require(`../lib/functions/index.js`);

// Import admin commands
const {
    groups,
    db,
    mentions,
    openai,
    imagine,
    getUserInfo,
    handleGlobalMessage,
} = require(`../commands/admin/index.js`);

// Import global variables
let {
    prefix,
    prefix_admin,
    ownerNumber,
    robotEmoji,
    paidUsers,
    physicsUsers,
    premiumGroups,
    commands,
    adminCommands,
} = require(`./globals`);

// Import specific commands
const { help: helpCommand, cae: caeCommand, fromis: fromisCommand } = commands;

// Set function to update premium groups and users
const setFetchedData = (
    fetchedPaidUsers,
    fetchedPhysicsUsers,
    fetchedPremiumGroups
) => {
    paidUsers = fetchedPaidUsers;
    physicsUsers = fetchedPhysicsUsers;
    premiumGroups = fetchedPremiumGroups;
};

// Update data when called
let refreshDataCallback;
const setRefreshDataCallback = callback => {
    refreshDataCallback = callback;
};

/*
  WhatsApp components
*/
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: launchPuppeteer(),
    webVersionCache: {
        type: `remote`,
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html`,
    },
});

client.on(`qr`, qr => {
    qrcode.generate(qr, {
        small: true,
    });
});

client.on(`auth_failure`, authFailureMessage => {
    console.error(`Error de autenticación`, authFailureMessage);
});

client.on(`ready`, () => {
    console.log(
        `Estamos listos, ¡el bot está en linea! Tenemos ${premiumGroups.length} grupos premium y ${paidUsers.length} usuarios premium. Los usuarios de física son ${physicsUsers.length}.`
    );
});

/*
  Event can be triggered by: message or message_create
  * message_create includes the messages by the bot itself (good for testing)
  * message is the one we want to use on production (it doesn't include the bot's messages
*/
client.on(`message`, async message => {
    const isCommand =
        message.body.startsWith(prefix) ||
        message.body.startsWith(prefix_admin);
    if (!isCommand) {
        return;
    }

    let contactInfo,
        chatInfo,
        senderPhoneNumber,
        isSenderPaidUser,
        senderName,
        groupId,
        commandParts,
        commandQuery;

    try {
        [contactInfo, chatInfo] = await Promise.all([
            message.getContact(),
            message.getChat(),
        ]);
        senderPhoneNumber = message.id.participant || message.id.remote;
        isSenderPaidUser = paidUsers.some(
            user => user.phone_number === senderPhoneNumber
        );

        if (!chatInfo.isGroup && !isSenderPaidUser) {
            await handleContactRequest(
                client,
                message,
                robotEmoji,
                ownerNumber
            );
            return;
        }

        senderName = contactInfo.pushname || message._data.notifyName; // The bot name is not defined, so we use the notifyName
        groupId = chatInfo.id._serialized;

        /* Creates an array with each word. Example: from "!spot dkdk" it will get "["!spot", "dkdk"]" */
        let stringifyMessage = message.body.trim().split(/\s+/);

        /* Get all the text after the command (yt & wiki & chat) */
        commandParts = message.body.trim().split(/\s+/);
        commandQuery = commandParts.slice(1).join(` `);

        /* Logging all commands received to Supabase */
        supabaseCommunicationModule.insertMessage(
            senderPhoneNumber,
            message.body,
            message.to,
            `users`
        );

        /*
          The checks are done in order of importance
          1. Check if the message is in a group
          Here there is a divergence between the admin and the regular commands
          1.a Regular: The message is in a premium group
          1.b Admin: The message is from a user who is a paid user
        */
        if (message.body.startsWith(prefix)) {
            if (
                !premiumGroups.some(
                    group => group.group_id === groupId && group.isActive
                )
            )
                return;

            const command = stringifyMessage[0].split(prefix)[1];

            if (!(command in commands)) return;

            switch (command) {
                case commands.help: {
                    const helpMessageText = help.getHelpMessage(
                        prefix,
                        stringifyMessage,
                        helpCommand
                    );
                    message.reply(`${robotEmoji} ${helpMessageText}`);
                    break;
                }
                case commands.sticker:
                    stickers.transformMediaToSticker(
                        chatInfo,
                        message,
                        senderName,
                        senderPhoneNumber,
                        robotEmoji
                    );
                    break;
                case commands.toimage:
                    stickers.processQuotedStickerMessage(
                        stringifyMessage,
                        message,
                        chatInfo,
                        robotEmoji,
                        senderName
                    );
                    break;
                case commands.url:
                    stickers.handleStickerURL(
                        stringifyMessage,
                        message,
                        robotEmoji,
                        reddit,
                        chatInfo,
                        MessageMedia,
                        senderName,
                        senderPhoneNumber
                    );
                    break;
                case commands.spot:
                    spotify.handleSpotifySongRequest(
                        client,
                        message,
                        MessageMedia,
                        commandQuery,
                        stringifyMessage,
                        robotEmoji
                    );
                    break;
                case commands.letra:
                    lyrics.handleSongLyricsRequest(
                        stringifyMessage,
                        message,
                        robotEmoji
                    );
                    break;
                case commands.cae:
                    cae.getCAEMessage(
                        prefix,
                        stringifyMessage,
                        caeCommand,
                        message,
                        robotEmoji
                    );
                    break;
                case commands.fromis:
                    reddit.getRedditImage(
                        message,
                        fromisCommand,
                        client,
                        MessageMedia
                    );
                    break;
                case commands.w:
                    wikipedia.handleWikipediaRequest(
                        stringifyMessage,
                        message,
                        robotEmoji,
                        commandQuery,
                        senderName,
                        client,
                        MessageMedia
                    );
                    break;
                case commands.yt: {
                    const searchResult = await youtube.searchOnYoutube(
                        commandQuery,
                        `fullData`
                    );

                    if (searchResult.error) {
                        message.reply(searchResult.message);
                    } else {
                        if (searchResult.thumbnailUrl) {
                            const media = await MessageMedia.fromUrl(
                                searchResult.thumbnailUrl,
                                { unsafeMime: true }
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
                    const audioResponse =
                        await youtube.sendYoutubeAudio(commandQuery);

                    if (audioResponse.error) {
                        message.reply(`${robotEmoji} ${audioResponse.message}`);
                    } else {
                        const media = MessageMedia.fromFilePath(
                            audioResponse.filePath
                        );
                        client.sendMessage(message.id.remote, media, {
                            sendAudioAsVoice: true,
                        });
                    }
                    utilities.deleteFile(audioResponse.filePath);
                    break;
                }
                case commands.watch: {
                    const videoResponse =
                        await youtube.sendYoutubeVideo(commandQuery);

                    if (videoResponse.error) {
                        message.reply(`${robotEmoji} ${videoResponse.message}`);
                    } else {
                        const isWithinLimit =
                            await utilities.isFileSizeWithinLimit(
                                videoResponse.filePath,
                                16
                            );

                        if (!isWithinLimit) {
                            message.reply(
                                `${robotEmoji} El video supera el límite de 16 MB. Prueba con otro video.`
                            );
                        } else {
                            const media = await MessageMedia.fromFilePath(
                                videoResponse.filePath
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
                        robotEmoji
                    );
                    break;
                case commands.doi:
                    sciHub.handleDoiRequest(
                        message,
                        client,
                        MessageMedia,
                        stringifyMessage,
                        robotEmoji
                    );
                    break;
                case commands.tex:
                    boTeX.handleLatexToImage(
                        stringifyMessage,
                        message,
                        client,
                        MessageMedia,
                        robotEmoji
                    );
                    break;
                case commands.paper:
                    semanticScholar.handleSearchPapersByKeywords(
                        stringifyMessage,
                        message,
                        commandQuery,
                        robotEmoji
                    );
                    break;
                case commands.author:
                    semanticScholar.handleSearchAuthor(
                        stringifyMessage,
                        message,
                        commandQuery,
                        robotEmoji
                    );
                    break;
                case commands.doc:
                    docsearch.searchDocuments(
                        stringifyMessage,
                        message,
                        commandQuery,
                        robotEmoji
                    );
                    break;
                case commands.drive:
                    docdown.handleGoogleDriveDownloads(
                        stringifyMessage,
                        message,
                        commandQuery,
                        client,
                        MessageMedia,
                        robotEmoji
                    );
                    break;
                case commands.chat:
                    if (commandQuery.length <= 1) {
                        message.reply(
                            `${robotEmoji} ¿De qué quieres hablar hoy?`
                        );
                        return;
                    }

                    if (!(await groups.hasValidSpecialDay(groupId))) {
                        message.reply(
                            `${robotEmoji} Deshabilitado. Este comando solo está disponible en días especiales.`
                        );
                        return;
                    }
                    /* eslint-disable no-case-declarations */
                    const chatResponse = await openai.handleChatWithGPT(
                        senderPhoneNumber,
                        groupId,
                        commandQuery
                    );
                    message.reply(`${robotEmoji} ${chatResponse}`);
                    break;
                case commands.edit:
                    editImage.handleEditImage(
                        stringifyMessage,
                        message,
                        client,
                        MessageMedia,
                        robotEmoji
                    );
                    break;
                case commands.t:
                    try {
                        const translatedMessage =
                            await translate.translateText(commandQuery);
                        message.reply(`${robotEmoji} ${translatedMessage}`);
                    } catch (error) {
                        message.reply(
                            `${robotEmoji} Sorry, I couldn't translate that message.`
                        );
                    }
                    break;
                default:
                    break;
            }

            message.react(`✅`);
        }

        /*
            The logic here is the following:
            1. Check if string[1] is an actual command, this must be done because the user could send a message starting with the prefix but not being a command
            2. Check if the user is a paid user
        */
        if (message.body.startsWith(prefix_admin)) {
            const command = stringifyMessage[0].split(prefix_admin)[1];
            if (!(command in adminCommands)) return;

            if (
                !paidUsers.some(user => user.phone_number === senderPhoneNumber)
            ) {
                return message.reply(
                    `${robotEmoji} Esta función está únicamente disponible para usuarios de pago.`
                );
            }

            /* Check if the sender is an admin of the group */
            const participantsArray = Object.values(chatInfo.participants);
            const admins = participantsArray.filter(
                participant => participant.isAdmin
            );

            const quotedMessage = await message.getQuotedMessage();

            switch (command) {
                case adminCommands.help: {
                    const adminHelpMessageText = help.getAdminHelpMessage(
                        prefix_admin,
                        stringifyMessage,
                        helpCommand
                    );
                    message.reply(`${robotEmoji} ${adminHelpMessageText}`);
                    break;
                }
                case adminCommands.todos:
                    mentions.mentionEveryone(
                        chatInfo,
                        client,
                        message,
                        senderName
                    );
                    break;
                case adminCommands.ban:
                    const banAll =
                        stringifyMessage.length === 2 &&
                        stringifyMessage[1] === `${prefix_admin}todos`;
                    groups.handleBanUserFromGroup(
                        admins,
                        stringifyMessage,
                        client,
                        chatInfo,
                        quotedMessage,
                        message,
                        robotEmoji,
                        banAll
                    );
                    break;
                case adminCommands.bot:
                    groups.handleToggleBotActivation(
                        stringifyMessage,
                        message,
                        chatInfo,
                        robotEmoji,
                        refreshDataCallback
                    );
                    break;
                case adminCommands.del:
                    groups.handleDeleteMessage(
                        admins,
                        stringifyMessage,
                        message,
                        quotedMessage,
                        client,
                        robotEmoji
                    );
                    break;
                case adminCommands.join:
                    groups.handleJoinGroupRequest(
                        stringifyMessage,
                        message,
                        client,
                        robotEmoji,
                        prefix_admin,
                        adminCommands.join
                    );
                    break;
                case adminCommands.addgroup:
                    db.handleUpgradeGroupToPremium(
                        stringifyMessage,
                        chatInfo,
                        message,
                        refreshDataCallback,
                        robotEmoji,
                        senderPhoneNumber
                    );
                    break;
                case adminCommands.add:
                    groups.handleAddUserToGroup(
                        admins,
                        message,
                        client,
                        robotEmoji
                    );
                    break;
                case adminCommands.addpremium:
                    db.handleUpgradeUserToPremium(
                        senderPhoneNumber,
                        ownerNumber,
                        quotedMessage,
                        stringifyMessage,
                        message,
                        robotEmoji,
                        prefix_admin
                    );
                    break;
                case adminCommands.refresh:
                    db.handleRefreshLocalDataFromDatabase(
                        senderPhoneNumber,
                        ownerNumber,
                        stringifyMessage,
                        message,
                        robotEmoji,
                        refreshDataCallback
                    );
                    break;
                case adminCommands.promote:
                    groups.handlePromoteUsersToAdmins(
                        admins,
                        message,
                        stringifyMessage,
                        quotedMessage,
                        chatInfo,
                        client,
                        robotEmoji
                    );
                    break;
                case adminCommands.demote:
                    groups.handleDemoteUsersToParticipants(
                        admins,
                        message,
                        stringifyMessage,
                        quotedMessage,
                        chatInfo,
                        client,
                        robotEmoji
                    );
                    break;
                case adminCommands.close:
                    const closeResponse =
                        await chatInfo.setMessagesAdminsOnly(true);
                    if (closeResponse) {
                        message.reply(
                            `${robotEmoji} Mensajes permitidos solo para administradores.`
                        );
                    } else {
                        message.reply(
                            `${robotEmoji} Error al cambiar la configuración. Asegúrate de tener los permisos necesarios.`
                        );
                    }
                    break;
                case adminCommands.open:
                    const openResponse =
                        await chatInfo.setMessagesAdminsOnly(false);
                    if (openResponse) {
                        message.reply(
                            `${robotEmoji} Mensajes permitidos para todos los miembros.`
                        );
                    } else {
                        message.reply(
                            `${robotEmoji} Error al cambiar la configuración. Asegúrate de tener los permisos necesarios.`
                        );
                    }
                    break;
                case adminCommands.chat:
                    if (commandQuery.length > 1) {
                        const chatResponse = await openai.handleChatWithGPT(
                            senderPhoneNumber,
                            groupId,
                            commandQuery
                        );
                        message.reply(`${robotEmoji} ${chatResponse}`);
                    } else {
                        message.reply(
                            `${robotEmoji} ¿De qué quieres hablar hoy?\n\n _Recuerda utilizado el ${prefix_admin}chat si quieres seguir conversando._`
                        );
                    }
                    break;
                case adminCommands.imagine:
                    if (commandQuery.length > 4) {
                        message.reply(
                            `${robotEmoji} Trabajando en ello... dame unos segundos.`
                        );
                        const translatedQuery =
                            await translate.translateText(commandQuery);
                        const pathsToImages =
                            await imagine.handleImagine(translatedQuery);
                        if (pathsToImages.length === 0)
                            return message.reply(
                                `${robotEmoji} No logré generar una imagen. Contacta al desarrollador.`
                            );

                        pathsToImages.forEach(pathToImage => {
                            const media =
                                MessageMedia.fromFilePath(pathToImage);
                            client.sendMessage(message.id.remote, media);
                        });
                        message.reply(
                            `${robotEmoji} ¡Terminamos, ya vienen las imágenes!`
                        );
                    } else {
                        message.reply(
                            `${robotEmoji} ¿Qué quieres ver? Escribe una descripción de la imagen que quieres ver.`
                        );
                    }
                    break;
                case adminCommands.subscription:
                    const subscriptionInfo = await getUserInfo(
                        client,
                        senderPhoneNumber,
                        robotEmoji,
                        paidUsers,
                        premiumGroups
                    );
                    await client.sendMessage(
                        senderPhoneNumber,
                        subscriptionInfo
                    );
                    await message.reply(
                        `${robotEmoji} Hey, te acabo de enviar un mensaje privado con más información sobre tu suscripción.`
                    );
                    break;
                case adminCommands.global:
                    await handleGlobalMessage(
                        client,
                        paidUsers,
                        senderPhoneNumber,
                        ownerNumber,
                        message,
                        robotEmoji,
                        stringifyMessage
                    );
                    break;
                default:
                    break;
            }

            message.react(`✅`);
        }
    } catch (error) {
        console.error(`Error procesando mensaje:`, error);
    }
});

module.exports = {
    client,
    setFetchedData,
    setRefreshDataCallback,
};
