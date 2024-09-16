const { callOpenAI } = require("../services/openai");
const { fetchLastNMessages, addMessage } = require("../services/database");
const {
    formatMessagesForChat,
    getSummaryPrompt,
    processMessages,
} = require("../utils/promptManager");
const config = require("../config");

async function handleChatCommand(senderId, groupId, query) {
    if (!query) {
        return "¿De qué quieres hablar hoy?";
    }

    try {
        let rawMessages = await fetchLastNMessages(senderId, groupId, 5);
        let processedMessages = processMessages(rawMessages);

        let messages;
        if (
            processedMessages.length === 0 ||
            processedMessages[0].length === 0
        ) {
            messages = formatMessagesForChat([], query);
        } else {
            const lastConversation =
                processedMessages[processedMessages.length - 1];
            const totalLength = lastConversation.reduce(
                (total, msg) => total + msg.content.length,
                0
            );

            if (totalLength > config.MAX_CONVERSATION_LENGTH) {
                const conversationText = lastConversation
                    .map(msg => `${msg.role}: ${msg.content}`)
                    .join("\n");
                const summaryPrompt = getSummaryPrompt(conversationText);
                const summary = await callOpenAI(summaryPrompt);
                messages = formatMessagesForChat(
                    [{ role: "system", content: `Summary: ${summary}` }],
                    query
                );
            } else {
                messages = formatMessagesForChat(lastConversation, query);
            }
        }

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
        console.error("Error in handleChatCommand:", error);
        return "Ocurrió un error al procesar tu solicitud.";
    }
}

module.exports = {
    handleChatCommand,
};
