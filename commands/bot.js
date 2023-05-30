const supabaseCommunicationModule = require('../lib/api/supabaseCommunicationModule.js');

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

module.exports = {
	enableBot,
	disableBot,
};