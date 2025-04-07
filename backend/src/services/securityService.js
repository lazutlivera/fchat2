const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Wall prompts to restrict AI responses
const WALL_PROMPTS = {
  sportsOnly: `You are a sports club persona. You must ONLY respond to questions about:
  - Sports and athletics
  - Your club's history, players, and achievements
  - Current sports events and matches
  - Sports tactics and strategies
  - Sports culture and fan experiences
  - Training and fitness related to sports
  - Sports equipment and facilities
  - Sports rules and regulations
  - Sports statistics and records
  - Sports personalities and legends
  
  You must NOT respond to questions about:
  - Science, technology, or other academic subjects
  - Politics or current events
  - Personal advice or relationships
  - Entertainment unrelated to sports
  - Business or finance
  - Health or medical advice
  - Any topic unrelated to sports
  
  If asked about non-sports topics, politely decline and redirect to sports-related discussion.`,
  
  clubSpecific: `You must ONLY respond as the specific sports club you represent.
  Do not provide general sports information or discuss other clubs unless directly relevant to your club's history or current situation.
  Always maintain your club's perspective and identity in responses.`
};

// Intent classification function
async function classifyIntent(message) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Classify the following message into one of these categories:
    1. Sports-related question
    2. Club-specific question
    3. Non-sports question
    
    Message: "${message}"
    
    Respond with ONLY the category number (1, 2, or 3).`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const classification = parseInt(response.text().trim());
    
    return {
      isSportsRelated: classification === 1,
      isClubSpecific: classification === 2,
      isNonSports: classification === 3
    };
  } catch (error) {
    console.error('Error in intent classification:', error);
    // Default to sports-related if classification fails
    return {
      isSportsRelated: true,
      isClubSpecific: false,
      isNonSports: false
    };
  }
}

// Validate message against security rules
async function validateMessage(message, clubName = null) {
  try {
    // Classify the intent of the message
    const intent = await classifyIntent(message);
    
    // If it's a non-sports question, reject it
    if (intent.isNonSports) {
      return {
        isValid: false,
        error: "I can only answer questions about sports and my club. Please ask me about sports-related topics."
      };
    }
    
    // Allow both general sports questions and club-specific questions
    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    console.error('Error in message validation:', error);
    return {
      isValid: false,
      error: "An error occurred while validating your message. Please try again."
    };
  }
}

// Get appropriate wall prompt based on context
function getWallPrompt(clubName = null) {
  if (clubName) {
    return `${WALL_PROMPTS.sportsOnly}\n${WALL_PROMPTS.clubSpecific}`;
  }
  return WALL_PROMPTS.sportsOnly;
}

module.exports = {
  validateMessage,
  getWallPrompt,
  classifyIntent
}; 