const { handleChatLogic } = require("../utils/chat-with-llm");
const groups = require("./admin/groups");

async function handleFreeChatCommand(senderId, groupId, query) {
    if (!query) {
        return "¿De qué quieres hablar hoy?";
    }

    const hasValidSpecialDay = await groups.hasValidSpecialDay(groupId);
    if (!hasValidSpecialDay) {
        return "Este comando solo está disponible en días especiales. Los usuarios de paga pueden activar este día especial 🎉";
    }

    try {
        return await handleChatLogic(senderId, groupId, query);
    } catch (error) {
        console.error("Error in handleFreeChatCommand:", error);
        return "Ocurrió un error al procesar tu solicitud.";
    }
}

module.exports = {
    handleFreeChatCommand,
};
