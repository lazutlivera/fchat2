const { GoogleGenerativeAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { validateMessage, getWallPrompt } = require('./securityService');
const { getClubPersona } = require('./database');

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'YOUR-API-KEY');

// Helper function to retry failed requests
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

async function generateResponse(message, useGrounding = true, clubName = null) {
  try {
    console.log('Generating response:', { message, useGrounding, clubName });
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    let prompt = message;
    let persona = '';

    if (clubName) {
      const clubPersona = await getClubPersona(clubName);
      if (clubPersona) {
        persona = clubPersona.personalityPrompt + '\n\n';
      }
    }

    // Configure search tool and generation settings
    const searchTool = {
      google_search: {}  // Enable Google Search tool
    };

    // Create chat with search tool enabled
    const chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
      tools: [searchTool],
    });

    // Send message and get response
    const result = await chat.sendMessage(persona + prompt);
    
    console.log('\nAPI Response Structure:');
    console.log('Result:', JSON.stringify(result, null, 2));

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const responseText = result.candidates[0].content.parts[0].text;

    // Extract sources from grounding metadata if available
    let grounding = null;
    const groundingMetadata = result.candidates[0].groundingMetadata;
    
    if (groundingMetadata && groundingMetadata.searchEntryPoint) {
      console.log('\nGrounding Metadata Found:');
      console.log(JSON.stringify(groundingMetadata, null, 2));

      // Extract sources from grounding chunks
      const sources = groundingMetadata.groundingChunks?.map(chunk => ({
        url: chunk.web?.url || '',
        title: chunk.web?.title || 'Source',
        snippet: chunk.web?.snippet || ''
      })) || [];

      if (sources.length > 0) {
        grounding = { sources };
      }
    } else {
      // Fallback: Try to extract sources from the text content
      const sources = [];
      const urlRegex = /(?:Source:|source:)?\s*(https?:\/\/[^\s\]]+)/g;
      let match;
      
      while ((match = urlRegex.exec(responseText)) !== null) {
        sources.push({
          url: match[1],
          title: 'Source'
        });
      }

      if (sources.length > 0) {
        grounding = { sources };
      }
    }

    return {
      text: responseText,
      timestamp: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Set future date for testing
      grounding: grounding,
      error: null,
      ...(clubName && { clubName, color: '#DA291C' }) // Add club info if available
    };

  } catch (error) {
    console.error('Error generating response:', error);
    return {
      text: null,
      timestamp: new Date().toISOString(),
      grounding: null,
      error: error.message
    };
  }
}

module.exports = {
  generateResponse
}; 