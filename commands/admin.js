/* Here we use let instead of const to a avoid the following error: */
/* TypeError: Assignment to constant variable. */

async function mentionEveryone(chat, client, message, senderName) {
  try {

    const og = await message.getQuotedMessage();

    if (chat.isGroup) {
      if (message.body === '@todos') {
        
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

      }
    }
  } catch (err) {
    console.error(err);
  }
}

/* https://github.com/pedroslopez/whatsapp-web.js/issues/2067
async function banUser(chat, participantId, message, robotEmoji) {
	try {
		console.log('participantId:', participantId)
	
		await chat.removeParticipants([participantId]);
		message.reply(`${robotEmoji} Usuario baneado exitosamente.`)
	} catch (error) {
		console.log('Failed to remove participant:', error);
	}
}
*/

module.exports = { 
  mentionEveryone,
	//banUser,
};