const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || 'YOUR-API-KEY');

// Wall prompts to restrict AI responses
const WALL_PROMPTS = {
  GENERAL: `You are a football club assistant. You must ONLY provide information about football-related topics. 
  If a question is not about football, politely decline to answer and explain that you can only discuss football-related topics.
  Never share personal information, sensitive data, or engage in harmful discussions.`,
  
  CLUB_SPECIFIC: `You are the official voice of {CLUB_NAME}. You must ONLY provide information about {CLUB_NAME} and football-related topics.
  If a question is not about {CLUB_NAME} or football, politely decline to answer and explain that you can only discuss {CLUB_NAME} and football-related topics.
  Never share personal information, sensitive data, or engage in harmful discussions.`
};

async function validateMessage(message, clubName = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Prepare the wall prompt based on whether this is club-specific or general
    const wallPrompt = clubName 
      ? WALL_PROMPTS.CLUB_SPECIFIC.replace(/{CLUB_NAME}/g, clubName)
      : WALL_PROMPTS.GENERAL;

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0,
      }
    });

    const result = await chat.sendMessage(`
      ${wallPrompt}
      
      Analyze the following message and respond with ONLY "VALID" if it's appropriate to answer based on the above rules,
      or "INVALID: [reason]" if it should not be answered.
      
      Message: "${message}"
    `);

    if (!result.candidates || result.candidates.length === 0) {
      return { isValid: false, error: 'Failed to validate message' };
    }

    const response = result.candidates[0].content.parts[0].text.trim();
    
    if (response === 'VALID') {
      return { isValid: true, error: null };
    } else {
      const reason = response.replace('INVALID:', '').trim();
      return { isValid: false, error: reason };
    }
  } catch (error) {
    console.error('Error validating message:', error);
    return { isValid: false, error: 'Failed to validate message' };
  }
}

function getWallPrompt(clubName = null) {
  return clubName 
    ? WALL_PROMPTS.CLUB_SPECIFIC.replace(/{CLUB_NAME}/g, clubName)
    : WALL_PROMPTS.GENERAL;
}

module.exports = {
  validateMessage,
  getWallPrompt
}; 