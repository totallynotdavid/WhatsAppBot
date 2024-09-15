const { callOpenAI } = require("../services/openai");
const { getSummaryPrompt } = require("../utils/promptManager");

async function handleSummarizeCommand(messages) {
    try {
        const messagesText = await Promise.all(
            messages.map(async msg => {
                const name = msg.author || msg.from || "Unknown";
                return `${name}: ${msg.body}`;
            })
        );

        const conversationText = messagesText.join("\n");
        const summaryPrompt = getSummaryPrompt(conversationText);

        const summary = await callOpenAI(summaryPrompt);

        return summary || "Lo siento, no pude generar un resumen.";
    } catch (error) {
        console.error("Error in handleSummarizeCommand:", error);
        return "Ocurrió un error al generar el resumen.";
    }
}

module.exports = {
    handleSummarizeCommand,
};
