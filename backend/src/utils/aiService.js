/**
 * AI Service for integrating with Google's Gemini API
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// API Key
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

// Check if API key is valid - don't log the full key
function checkApiKey() {
  if (!GEMINI_API_KEY) {
    console.error('ERROR: GOOGLE_GEMINI_API_KEY is not set in .env file');
    console.error('Please make sure you have a valid API key from https://ai.google.dev/tutorials/setup');
    return false;
  }
  
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY' || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.error('ERROR: GOOGLE_GEMINI_API_KEY is still set to the default placeholder value');
    console.error('Please update with your actual API key from https://ai.google.dev/tutorials/setup');
    return false;
  }
  
  // Only show first few and last few chars of the key for debugging
  const keyLength = GEMINI_API_KEY.length;
  const obscuredKey = keyLength > 8 
    ? `${GEMINI_API_KEY.substring(0, 4)}...${GEMINI_API_KEY.substring(keyLength - 4)}`
    : '********';
  
  console.log(`Using Gemini API key: ${obscuredKey} (${keyLength} chars)`);
  return true;
}

// Display API key info at startup
const isApiKeyValid = checkApiKey();

// Initialize the Google Generative API if key is valid
const genAI = isApiKeyValid ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Generate a response using Google's Gemini API with Search grounding
 * @param {string} userMessage - The user's input message
 * @returns {Promise<Object>} - The AI response object with grounding information
 */
async function generateAIResponse(userMessage) {
  try {
    console.log(`Generating AI response for message: ${userMessage}`);
    
    // Check if genAI was initialized
    if (!genAI) {
      throw new Error('Gemini API client not initialized - API key issue');
    }
    
    // Get the gemini-2.0-flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    
    console.log('Calling Gemini 2.0-flash API with Search grounding...');
    
    // Use the model with Search as a tool
    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: userMessage }]
      }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ],
      tools: [
        { googleSearch: {} }
      ]
    });

    // Get the response text
    const response = result.response;
    const generatedText = response.text();
    
    console.log('Received response from Gemini API');
    
    // Extract grounding information if available
    let groundingInfo = null;
    
    try {
      if (response.candidates && 
          response.candidates[0].groundingMetadata) {
        console.log('Grounding metadata found in response');
        const metadata = response.candidates[0].groundingMetadata;
        
        groundingInfo = {
          sources: metadata.groundingChunks || [],
          searchSuggestions: metadata.searchEntryPoint?.renderedContent || null,
          webSearchQueries: metadata.webSearchQueries || []
        };
        
        console.log(`Found ${groundingInfo.sources.length} sources and ${groundingInfo.webSearchQueries?.length || 0} search queries`);
      } else {
        console.log('No grounding metadata found in response');
      }
    } catch (groundingError) {
      console.error('Error extracting grounding information:', groundingError.message);
    }
    
    return {
      text: generatedText,
      timestamp: new Date().toISOString(),
      grounding: groundingInfo
    };
  } catch (error) {
    console.error('Error generating AI response:');
    
    if (error.response) {
      console.error('Response error:', error.response);
    } else {
      console.error(error.message);
    }
    
    // Provide more specific error messages
    let errorText = "I'm sorry, I encountered an error while processing your request. Please try again later.";
    
    if (!isApiKeyValid) {
      errorText = "The server is not configured with a valid Gemini API key. Please check the server logs and update the .env file.";
    } else if (error.message && error.message.includes('403')) {
      errorText = "The server's API key does not have permission to access Gemini. Please check that the key is valid and has the correct permissions.";
    } else if (error.message && error.message.includes('429')) {
      errorText = "The server has hit Gemini API rate limits. Please try again in a few minutes.";
    }
    
    return {
      text: errorText,
      timestamp: new Date().toISOString(),
      error: true
    };
  }
}

/**
 * This function is no longer needed as grounding is integrated directly with Gemini 2.0
 * @deprecated Use generateAIResponse instead which includes grounding
 */
async function enhanceWithGrounding(userMessage) {
  console.warn('enhanceWithGrounding is deprecated. Grounding is now integrated in generateAIResponse');
  return { groundedContext: '', confidence: 0 };
}

module.exports = {
  generateAIResponse,
  enhanceWithGrounding,
  checkApiKey
}; 