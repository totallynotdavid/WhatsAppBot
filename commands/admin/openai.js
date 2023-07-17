const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Configuration, OpenAIApi } = require('openai');
const supabaseCommunicationModule = require('../../lib/api/supabaseCommunicationModule.js');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

function checkAndModifyUserMessage(userMessage) {
  const maxLength = 550;

  if (userMessage.length > maxLength) {
    userMessage = userMessage.substring(0, maxLength) + '...';
  }

  return userMessage;
}

const generateText = async (chatMessage, previousMessages) => {
  const userMessageContent = checkAndModifyUserMessage(chatMessage);

  const messages = [
    { role: 'system', content: 'You are a helpful and concise assistant. Use Spanish. Avoid generating inappropriate content.' },
    ...previousMessages,
    { role: 'user', content: userMessageContent },
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 250,
    });

    // Return null if the API call returns an unexpected response
    if (completion.data.choices && completion.data.choices[0] && completion.data.choices[0].message) {
      return completion.data.choices[0].message.content;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 429) {
        console.error(`OpenAI API rate limit exceeded: ${error.response.data}`);
        return 'Lo siento, hemos alcanzado nuestro límite de capacidad para hoy. Por favor, intenta de nuevo más tarde.';
      } else {
        console.error(error.response.status, error.response.data);
      }
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
    }
    return null;
  }
}

async function handleChatWithGPT(stringifyMessage, message, senderNumber, group, query) {
  let previousMessages = [];
  let chatResponse = '';

  try {
    previousMessages = await supabaseCommunicationModule.fetchLastNMessages(
      senderNumber,
      group,
      3 * 2 - 1, // Decrease by 1 as the new message from the user will be added later
    );

    // Filter out previous messages that have null content (retrocompatibility)
    previousMessages = previousMessages.filter(m => m.content !== null);

    const chatMessage = stringifyMessage.slice(1).join(' ');
    chatResponse = await generateText(chatMessage, previousMessages);

    // Fix: If response is null, don't add it to the database
    if (chatResponse !== null) {
      await Promise.all([
        supabaseCommunicationModule.addGPTConversations(senderNumber, query, group, 'gpt_messages'), // User's message
        supabaseCommunicationModule.addGPTConversations(senderNumber, chatResponse, group, 'gpt_messages', 'assistant'), // Assistant's response
      ]);
    } else {
      await Promise.all([
        supabaseCommunicationModule.addGPTConversations(senderNumber, query, group, 'gpt_messages'), // User's message
        supabaseCommunicationModule.addGPTConversations(senderNumber, 'Assistant did not have a response.', group, 'gpt_messages', 'assistant'), // Placeholder response
      ]);
    }
  } catch (error) {
    console.error(`Error in handleChatWithGPT: ${error.message}`);
  }

  return chatResponse;
}

module.exports = {
  handleChatWithGPT,
}
