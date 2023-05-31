async function processQuotedStickerMessage(stringifyMessage, message, chat) {
	if (stringifyMessage.length === 1 && message._data.quotedMsg.type === 'sticker') {
		originalQuotedMessage = await message.getQuotedMessage();
		mediaSticker = await originalQuotedMessage.downloadMedia();
		await chat.sendMessage(mediaSticker, { sendMediaAsSticker: false, caption: `${robotEmoji} Solicitado por ${senderName}.` });
	} else {
		message.reply(`${robotEmoji} Contesta a un mensaje con un sticker. Solo usa el comando, no añadas nada más.`);
		message.react('⚠️');
	}
}

module.exports = {
	processQuotedStickerMessage,
};