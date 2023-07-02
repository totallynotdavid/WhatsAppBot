const supabaseCommunicationModule = require('../../lib/api/supabaseCommunicationModule.js');

/* https://github.com/pedroslopez/whatsapp-web.js/issues/2067 */
async function banUser(chat, participantId) {
  // eslint-disable-next-line
  try {  
    await chat.removeParticipants([participantId]);
  } catch (error) {
    throw error;
  }
}

async function banMultipleUsers(client, chat, userIds, message, robotEmoji) {
  let totalBanned = 0;
  let totalErrors = 0;

  for (let userId of userIds) {
    if (userId === `${client.info.wid.user}:8@c.us`) {
      continue;
    }
    try {
      await banUser(chat, userId);
      totalBanned++;
    } catch (error) {
      totalErrors++;
    }
  }

  if (totalBanned > 0) {
    message.reply(`${robotEmoji} ${totalBanned} usuario(s) baneado(s) exitosamente.`);
  }
  if (totalErrors > 0) {
    message.reply(`${robotEmoji} Hubo problemas al banear a ${totalErrors} usuario(s).`);
  }
}

function handleBanUserFromGroup(admins, stringifyMessage, client, chat, quotedMessage, message, robotEmoji) {
  if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
    return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
  }

  if (quotedMessage && stringifyMessage.length === 1) {
    const quotedAuthor = quotedMessage.author;
    if (quotedAuthor === `${client.info.wid.user}:8@c.us`) {
      message.reply(`${robotEmoji} Cómo te atreves.`);
    } else {
      banMultipleUsers(client, chat, [quotedAuthor], message, robotEmoji);
    }
  } else if (stringifyMessage.length > 1) {
    banMultipleUsers(client, chat, message.mentionedIds, message, robotEmoji);
  } else {
    message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para eliminarlo del grupo.`);
  }
}

function handlePromoteUsersToAdmins(admins, message, stringifyMessage, quotedMessage, chat, client, robotEmoji) {
  if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
    return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
  }

  if (stringifyMessage.length === 1 && quotedMessage) {
    processUser(quotedMessage.author, (userId) => !admins.some(admin => admin.id._serialized === userId), 'promoteParticipants', 'Se ha añadido', 'Este usuario ya es administrador.');
  } else if (stringifyMessage.length > 1 && message.mentionedIds && !quotedMessage) {
    processUser(message.mentionedIds, (userId) => !admins.some(admin => admin.id._serialized === userId), 'promoteParticipants', 'Se han añadido', 'Todos los usuarios mencionados ya son administradores.', chat, message, robotEmoji);
  } else {
    message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para hacerle admin.`);
  }
}

function handleDemoteUsersToParticipants(admins, message, stringifyMessage, quotedMessage, chat, client, robotEmoji) {
  if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
    return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
  }

  if (stringifyMessage.length === 1 && quotedMessage) {
    processUser(quotedMessage.author, (userId) => admins.some(admin => admin.id._serialized === userId), 'demoteParticipants', 'Se ha eliminado', 'Este usuario no es administrador.');
  } else if (stringifyMessage.length > 1 && message.mentionedIds && !quotedMessage) {
    processUser(message.mentionedIds, (userId) => admins.some(admin => admin.id._serialized === userId), 'demoteParticipants', 'Se han eliminado', 'Ninguno de los usuarios mencionados es administrador.', chat, message, robotEmoji);
  } else {
    message.reply(`${robotEmoji} Responde a un mensaje o menciona a alguien para quitarle el admin.`);
  }
}

async function processUser(userIds, adminCondition, action, successMessage, failMessage, chat, message, robotEmoji) {
  const userArray = Array.isArray(userIds) ? userIds : [userIds];
  const usersToProcess = userArray.filter(userId => adminCondition(userId));

  if (usersToProcess.length > 0) {
    await chat[action](usersToProcess);
    message.reply(`${robotEmoji} ${successMessage} ${usersToProcess.length}`);
  } else {
    message.reply(`${robotEmoji} ${failMessage}`);
  }
}

async function handleJoinGroupRequest(stringifyMessage, message, client, robotEmoji) {
  if (stringifyMessage.length === 2) {
    const inviteLink = stringifyMessage[1];
    const inviteCode = inviteLink.split('https://chat.whatsapp.com/')[1];
    try {
      await client.acceptInvite(inviteCode);
      message.reply(`${robotEmoji} ¡Unido!`);
    } catch (error) {
      message.reply(`${robotEmoji} No se pudo unir. ¿Está el enlace correcto?`);
    }
  } else {
    message.reply(`${robotEmoji} Envía el enlace de invitación del grupo.`);
  }
}

async function handleDeleteMessage(admins, stringifyMessage, message, quotedMessage, client, robotEmoji) {
  if (!admins.some(admin => admin.id._serialized === `${client.info.wid.user}@c.us`)) {
    return message.reply(`${robotEmoji} Es necesario que el bot sea administrador del grupo.`);
  }

  if (quotedMessage && stringifyMessage.length === 1) {
    const quotedAuthor = quotedMessage.author;
    if (quotedAuthor === `${client.info.wid.user}:8@c.us`) {
      message.reply(`${robotEmoji} Cómo te atreves.`);
    }
    await quotedMessage.delete(true);
  } else {
    message.reply(`${robotEmoji} Responde a un mensaje para eliminarlo.`);
  }
}

async function handleToggleBotActivation(stringifyMessage, message, chat, robotEmoji, refreshDataCallback) {
  if (stringifyMessage.length === 2) {
    const botCommand = stringifyMessage[1];

    switch (botCommand) {
      case 'on':
        await enableBot(message, chat.id._serialized, robotEmoji);
        await refreshDataCallback();
        break;
      case 'off':
        await disableBot(message, chat.id._serialized, robotEmoji);
        await refreshDataCallback();
        break;
      default:
        message.reply(`${robotEmoji} Solo puedes habilitar o deshabilitar el bot.`);
        break;
    }
  } else {
    message.reply(`${robotEmoji} ¿Y qué quieres que haga?`);
  }
}

async function enableBot(message, groupId, robotEmoji) {
  try {
    const group = await supabaseCommunicationModule.searchPremiumGroup(groupId);
    if (group.isActive) {
      message.reply(`${robotEmoji} El bot ya está activado para este grupo.`);
    } else {
      await supabaseCommunicationModule.updateBotStatus(groupId, true);
      message.reply(`${robotEmoji} El bot se ha activado para este grupo.`);
    }
  } catch (error) {
    console.error(error);
  }
  return Promise.resolve();
}

async function disableBot(message, groupId, robotEmoji) {
  try {
    const group = await supabaseCommunicationModule.searchPremiumGroup(groupId);
    if (!group.isActive) {
      message.reply(`${robotEmoji} El bot ya está desactivado para este grupo.`);
    } else {
      await supabaseCommunicationModule.updateBotStatus(groupId, false);
      message.reply(`${robotEmoji} El bot se ha desactivado para este grupo.`);
    }
  } catch (error) {
    console.error(error);
  }
  return Promise.resolve();
}

async function hasValidSpecialDay(groupId) {
  const groupData = await supabaseCommunicationModule.searchSpecialDay(groupId);

  if (groupData && groupData.special_day_expiry) {
    const now = new Date();
    const specialDayExpiry = new Date(groupData.special_day_expiry);
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const expiryUtc = Date.UTC(specialDayExpiry.getUTCFullYear(), specialDayExpiry.getUTCMonth(), specialDayExpiry.getUTCDate());

    return nowUtc <= expiryUtc;
  }
  return false;
}

module.exports = {
  handleBanUserFromGroup,
  handlePromoteUsersToAdmins,
  handleDemoteUsersToParticipants,
  handleJoinGroupRequest,
  handleDeleteMessage,
  handleToggleBotActivation,
	hasValidSpecialDay,
};