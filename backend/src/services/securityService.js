const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

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
    // Prepare the wall prompt based on whether this is club-specific or general
    const wallPrompt = clubName 
      ? WALL_PROMPTS.CLUB_SPECIFIC.replace(/{CLUB_NAME}/g, clubName)
      : WALL_PROMPTS.GENERAL;

    // Make API request
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `
              ${wallPrompt}
              
              Analyze the following message and respond with ONLY "VALID" if it's appropriate to answer based on the above rules,
              or "INVALID: [reason]" if it should not be answered.
              
              Message: "${message}"
            `
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.candidates || response.data.candidates.length === 0) {
      return { isValid: false, error: 'Failed to validate message' };
    }

    const responseText = response.data.candidates[0].content.parts[0].text.trim();
    
    if (responseText === 'VALID') {
      return { isValid: true, error: null };
    } else {
      const reason = responseText.replace('INVALID:', '').trim();
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