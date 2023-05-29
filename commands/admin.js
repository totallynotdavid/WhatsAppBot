/* Here we use let instead of const to a avoid the following error: */
/* TypeError: Assignment to constant variable. */

async function mentionEveryone(chat, client, message, senderName) {
  try {
    const og = await message.getQuotedMessage();

    let text = '';
		let mentions = [];

		/* Looping through all the members */
		for (let participant of chat.participants) {
			const contact = await client.getContactById(
				participant.id._serialized
			);
			mentions.push(contact);
			text += `@${participant.id.user} `;
		}

		/* Make sure the message is answered by replying even if it is a quoted message */

		if(message.hasQuotedMsg){
			og.reply(text, null, { mentions });
			message.reply(`🤖 Este mensaje fue solicitado por ${senderName}`)
		}
		else{
			chat.sendMessage(text,{mentions})
			message.reply(`🤖 Este mensaje fue solicitado por ${senderName}`)
		}
  } catch (err) {
    console.error(err);
  }
}

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

module.exports = { 
  mentionEveryone,
	banMultipleUsers,
};