const textUtils = require("./text");

function getChatSystemPrompt() {
    return {
        role: "system",
        content:
            "Act as a succinct assistant. Talk in Spanish. No inappropriate content.",
    };
}

function formatMessagesForChat(messages, query) {
    return [
        getChatSystemPrompt(),
        ...messages.map(msg => ({
            role: msg.role,
            content: textUtils.trimUserMessage(msg.content),
        })),
        { role: "user", content: textUtils.trimUserMessage(query) },
    ];
}

function getSummaryPrompt(text) {
    return [
        {
            role: "system",
            content:
                "You are a meeting recorder. Summarize the conversation in Spanish. Mention who said what using first names. Be straightforward and concise.",
        },
        { role: "user", content: text },
    ];
}

module.exports = {
    formatMessagesForChat,
    getSummaryPrompt,
};
