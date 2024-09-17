const { callOpenAI } = require("../services/openai");
const { getSummaryPrompt } = require("../utils/promptManager");
const fs = require("fs").promises;

async function handleSummarizeCommand(messages) {
    const logFile = "debug_log.txt";
    const log = [];

    try {
        log.push("Starting handleSummarizeCommand");

        // Filter and combine messages
        const processedMessages = messages.reduce((acc, msg) => {
            if (msg.content && msg.content.trim()) {
                const name = msg.author || msg.from || "Unknown";
                if (acc.length && acc[acc.length - 1].name === name) {
                    acc[acc.length - 1].content += ` ${msg.content}`;
                } else {
                    acc.push({ name, content: msg.content });
                }
            }
            return acc;
        }, []);

        const conversationText = processedMessages
            .map(msg => `${msg.name}: ${msg.content}`)
            .join("\n");
        log.push(`Processed conversation text: ${conversationText}`);

        const summaryPrompt = getSummaryPrompt(conversationText);
        log.push(`Summary prompt: ${JSON.stringify(summaryPrompt)}`);

        const summary = await callOpenAI(summaryPrompt);
        log.push(`OpenAI response: ${summary}`);

        // Write log to file
        await fs.writeFile(logFile, log.join("\n"));

        return summary;
    } catch (error) {
        console.error("Error in handleSummarizeCommand:", error);
        log.push(`Error: ${error.message}`);

        // Write log to file even if there's an error
        await fs.writeFile(logFile, log.join("\n"));

        return "Ocurrió un error al generar el resumen.";
    }
}

module.exports = {
    handleSummarizeCommand,
};
