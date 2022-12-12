/* Here we use let instead of const to a avoid the following error: */
/* TypeError: Assignment to constant variable. */

async function mentionEveryone(chat, client, message) {
  try {

    const og = await message.getQuotedMessage();

    if (chat.isGroup) {
      if (message.body === '@todos') {
        
        let text = "";
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
        }
        else{
          chat.sendMessage(text,{mentions})
        }

      }
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = { 
  mentionEveryone
};