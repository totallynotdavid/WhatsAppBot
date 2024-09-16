const { handleChatLogic } = require("../utils/chat-with-llm");

async function handleChatCommand(senderId, groupId, query) {
    if (!query) {
        return "¿De qué quieres hablar hoy?";
    }

    try {
        return await handleChatLogic(senderId, groupId, query);
    } catch (error) {
        console.error("Error in handleChatCommand:", error);
        return "Ocurrió un error al procesar tu solicitud.";
    }
}

module.exports = {
    handleChatCommand,
};
