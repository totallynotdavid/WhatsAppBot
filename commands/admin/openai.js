const path = require(`path`);
const { get } = require(`lodash`);
require(`dotenv`).config({ path: path.resolve(__dirname, `../../.env`) });
const { Configuration, OpenAIApi } = require(`openai`);
const supabaseCommunicationModule = require(
    `../../lib/api/supabaseCommunicationModule.js`
);

const config =
    process.env.NODE_ENV === `production`
        ? require(`../../config.prod`)
        : require(`../../config.dev`);

const { MAX_USER_MSG_LENGTH, MAX_TOKENS, MAX_CONVERSATION_LENGTH } = config;

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/**
 * Trims the user message to a specified maximum length.
 * @param {string} userMessage - The user's message.
 * @param {number} [maxLength=MAX_USER_MSG_LENGTH] - The maximum allowed length.
 * @param {boolean} [trimFromStart=false] - Whether to trim from the start or end of the message.
 * @returns {string} The trimmed message.
 */
function trimUserMessage(
    userMessage,
    maxLength = MAX_USER_MSG_LENGTH,
    trimFromStart = false
) {
    if (userMessage.length <= maxLength) {
        return userMessage;
    }

    let trimmedMessage;

    if (trimFromStart) {
        // example: "Hello world" -> "llo world..."
        trimmedMessage = userMessage.substring(userMessage.length - maxLength);
    } else {
        // example: "Hello world" -> "Hello wo..."
        trimmedMessage = userMessage.substring(0, maxLength);
        trimmedMessage += `...`;
    }

    return trimmedMessage;
}

async function callOpenAI(apiMethod, options) {
    try {
        const result = await openai[apiMethod](options);
        const contentPath =
            apiMethod === `createCompletion`
                ? `choices[0].text`
                : `choices[0].message.content`;

        const content = get(result.data, contentPath);
        if (!content) {
            console.error(`OpenAI response does not contain expected data`);
            return null;
        }
        return content;
    } catch (error) {
        console.error(`Error with OpenAI API request: ${error.message}`);
        console.error(`Request options:`, options);
        return null;
    }
}

/**
 * Handles the chat conversation with GPT.
 * @param {string} senderNumber - The sender's phone number.
 * @param {string} group - The group identifier.
 * @param {string} query - The user's query.
 * @returns {Promise<string|null>} The GPT's response or null if an error occurred.
 */
const handleChatWithGPT = async (senderNumber, group, query) => {
    try {
        let previousMessages =
            await supabaseCommunicationModule.fetchLastNMessages(
                senderNumber,
                group,
                3 * 2 - 1 // Fetch 5 messages from the database + 1 sent by the user
            );

        const flattenedMessages = previousMessages.flat();
        const totalLength = flattenedMessages.reduce(
            (total, msg) => total + msg.content.length,
            0
        );

        let messages;
        if (totalLength > MAX_CONVERSATION_LENGTH) {
            const promptForSummary = flattenedMessages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join(`\n`);
            const trimmedMessage = trimUserMessage(promptForSummary, 500, true);
            const summary = await callOpenAI(`createCompletion`, {
                model: `text-davinci-003`,
                prompt: `Summarize 🗣️ in > 15 words:\n${trimmedMessage}`,
                max_tokens: 50,
            });

            if (summary) {
                await supabaseCommunicationModule.addGPTConversations(
                    senderNumber,
                    summary,
                    group,
                    `gpt_messages`,
                    `system`
                );
                messages = [
                    { role: `system`, content: summary },
                    { role: `user`, content: trimUserMessage(query) },
                ];
            } else {
                // If summary generation failed, start a new conversation
                messages = [
                    {
                        role: `system`,
                        content: `Act as a succinct assistant. Talk in Spanish. No inappropriate content. 🗣️: `,
                    },
                    { role: `user`, content: trimUserMessage(query) },
                ];
            }
        } else if (flattenedMessages.length === 0) {
            // If there are no previous messages, start a new conversation
            messages = [
                {
                    role: `system`,
                    content: `Act as a succinct assistant. Talk in Spanish. No inappropriate content. 🗣️: `,
                },
                { role: `user`, content: trimUserMessage(query) },
            ];
        } else {
            const chatMessage = trimUserMessage(query);
            messages = [
                {
                    role: `system`,
                    content: `Act as a succinct assistant. Talk in Spanish. No inappropriate content. 🗣️: `,
                },
                ...flattenedMessages,
                { role: `user`, content: chatMessage },
            ];
        }

        const chatResponse = await callOpenAI(`createChatCompletion`, {
            model: `gpt-3.5-turbo-0125`,
            messages: messages,
            max_tokens: MAX_TOKENS,
        });

        if (chatResponse !== null) {
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                query,
                group,
                `gpt_messages`
            );
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                chatResponse,
                group,
                `gpt_messages`,
                `assistant`
            );
        } else {
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                query,
                group,
                `gpt_messages`
            );
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                `Assistant did not have a response.`,
                group,
                `gpt_messages`,
                `assistant`
            );
        }

        return chatResponse;
    } catch (error) {
        console.error(`Error in handleChatWithGPT: ${error.message}`);
        return null;
    }
};

module.exports = {
    handleChatWithGPT,
};
