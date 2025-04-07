const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { validateMessage, getWallPrompt } = require('./securityService');
const { getClubPersona } = require('./database');

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
    
    let prompt = message;
    let persona = '';

    if (clubName) {
      const clubPersona = await getClubPersona(clubName);
      if (clubPersona) {
        persona = clubPersona.personalityPrompt + '\n\n';
      }
    }

    // Make API request
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: persona + prompt
          }]
        }],
        tools: [{
          google_search: {}
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\nAPI Response Structure:');
    console.log('Result:', JSON.stringify(response.data, null, 2));

    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const responseText = response.data.candidates[0].content.parts[0].text;

    // Extract sources from grounding metadata if available
    let grounding = null;
    const groundingMetadata = response.data.candidates[0].groundingMetadata;
    
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      console.log('\nGrounding Metadata Found:');
      console.log(JSON.stringify(groundingMetadata, null, 2));

      // Extract sources from grounding chunks
      const sources = groundingMetadata.groundingChunks.map(chunk => ({
        url: chunk.web?.uri || '',
        title: chunk.web?.title || 'Source',
        snippet: chunk.web?.snippet || ''
      }));

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