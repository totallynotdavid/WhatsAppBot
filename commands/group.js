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

module.exports = {
	processUser,
};