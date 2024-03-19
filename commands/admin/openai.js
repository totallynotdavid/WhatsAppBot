const path = require('path');
const { get } = require('lodash');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Configuration, OpenAIApi } = require('openai');
const supabaseCommunicationModule = require('../../lib/api/supabaseCommunicationModule.js');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const MAX_USER_MSG_LENGTH = 200;
const MAX_TOKENS = 250;
const MAX_CONVERSATION_LENGTH = 1350;

function trimUserMessage(
    userMessage,
    maxLength = MAX_USER_MSG_LENGTH,
    trimFromStart = false,
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
        trimmedMessage = trimmedMessage + '...';
    }

    return `${trimmedMessage}`;
}

async function callOpenAI(apiMethod, options) {
    try {
        const result = await openai[apiMethod](options);
        const contentPath =
      apiMethod === 'createCompletion'
          ? 'choices[0].text'
          : 'choices[0].message.content';

        if (!result.data || !get(result.data, contentPath)) {
            console.error('OpenAI response does not contain expected data');
            return null;
        }
        return get(result, `data.${contentPath}`);
    } catch (error) {
        console.error(`Error with OpenAI API request: ${error.message}`);
        return null;
    }
}

const handleChatWithGPT = async (senderNumber, group, query) => {
    try {
        let previousMessages = await supabaseCommunicationModule.fetchLastNMessages(
            senderNumber,
            group,
            3 * 2 - 1, // Fetch 5 messages from the database + 1 sent by the user
        );

        const flattenedMessages = previousMessages.flat();
        const totalLength = flattenedMessages.reduce(
            (total, msg) => total + msg.content.length,
            0,
        );

        if (totalLength > MAX_CONVERSATION_LENGTH) {
            const promptForSummary = flattenedMessages
                .map((msg) => `${msg.role}: ${msg.content}`)
                .join('\n');
            const trimmedMessage = trimUserMessage(promptForSummary, 500, true);
            const summary = await callOpenAI('createCompletion', {
                model: 'text-davinci-003',
                prompt: `Summarize 🗣️ in > 15 words:\n${trimmedMessage}`,
                max_tokens: 50,
            });

            if (summary) {
                await supabaseCommunicationModule.addGPTConversations(
                    senderNumber,
                    summary,
                    group,
                    'gpt_messages',
                    'system',
                );
                previousMessages = [{ role: 'system', content: summary }];
            }
        }

        let nonSummaryMessages;
        let summaryMessage;

        if (Array.isArray(previousMessages[previousMessages.length - 1])) {
            nonSummaryMessages = previousMessages.slice(0, -1).flat(Infinity);
            summaryMessage =
        previousMessages[previousMessages.length - 1].flat(Infinity);
        } else {
            nonSummaryMessages = previousMessages.slice(0, -1).flat(Infinity);
            summaryMessage = [previousMessages[previousMessages.length - 1]];
        }

        const chatMessage = trimUserMessage(query);

        const messages = [
            {
                role: 'system',
                content:
          'Act as a succinct assistant. Talk in Spanish. No inappropriate content. 🗣️: ',
            },
            ...nonSummaryMessages,
            ...summaryMessage,
            { role: 'user', content: chatMessage },
        ];

        let chatResponse = await callOpenAI('createChatCompletion', {
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: MAX_TOKENS,
        });

        if (chatResponse !== null) {
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                query,
                group,
                'gpt_messages',
            );
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                chatResponse,
                group,
                'gpt_messages',
                'assistant',
            );
        } else {
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                query,
                group,
                'gpt_messages',
            );
            await supabaseCommunicationModule.addGPTConversations(
                senderNumber,
                'Assistant did not have a response.',
                group,
                'gpt_messages',
                'assistant',
            );
        }

        return chatResponse;
    } catch (error) {
        console.error(`Error in handleChatWithGPT: ${error.message}`);
        console.error(error.stack);
        return null;
    }
};

module.exports = {
    handleChatWithGPT,
};
