const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

function checkAndModifyUserMessage(userMessage) {
  const maxLength = 500;

  if (userMessage.length > maxLength) {
    userMessage = userMessage.substring(0, maxLength) + '...';
  }

  return userMessage;
}

const generateText = async (chatMessage) => {
  const userMessageContent = checkAndModifyUserMessage(chatMessage);

  const messages = [
    { role: 'system', content: 'You are a helpful assistant. Use Spanish. Avoid generating inappropriate content.' },
    { role: 'user', content: userMessageContent },
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 150,
    });
    return completion.data.choices[0].message.content;
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
  }
}

module.exports = {
  generateText,
};