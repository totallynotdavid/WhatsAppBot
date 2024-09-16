const { callOpenAI } = require("../services/openai");
const { fetchLastNMessages, addMessage } = require("../services/supabase");
const { formatMessagesForChat } = require("../utils/promptManager");
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
        let previousMessages = await fetchLastNMessages(senderId, groupId, 5);
        let messages = formatMessagesForChat(previousMessages, query);

        const chatResponse = await callOpenAI(messages);

        if (chatResponse) {
            await addMessage(senderId, groupId, "user", query);
            await addMessage(senderId, groupId, "assistant", chatResponse);
            return chatResponse;
        } else {
            await addMessage(senderId, groupId, "user", query);
            await addMessage(senderId, groupId, "assistant", "No response");
            return "Lo siento, no pude generar una respuesta.";
        }
    } catch (error) {
        console.error("Error in handleFreeChatCommand:", error);
        return "Ocurrió un error al procesar tu solicitud.";
    }
}

module.exports = {
    handleFreeChatCommand,
};
