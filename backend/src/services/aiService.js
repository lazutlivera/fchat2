const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { validateMessage, getWallPrompt } = require('./securityService');
const { getClubPersona } = require('./database');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

async function generateResponse(message, useGrounding = true, clubName = null) {
  try {
    // Validate the message first
    const validation = await validateMessage(message, clubName);
    if (!validation.isValid) {
      return {
        text: null,
        timestamp: new Date().toISOString(),
        grounding: null,
        error: validation.error
      };
    }

    // If club name is provided, get the club persona from database
    let clubPersona = null;
    if (clubName && clubName !== 'false') {
      clubPersona = await getClubPersona(clubName);
      if (!clubPersona) {
        return {
          text: null,
          timestamp: new Date().toISOString(),
          grounding: null,
          error: `Club persona for ${clubName} not found.`
        };
      }
    }

    // Configure model with search tool
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Create a chat instance with search tool
    const chat = model.startChat({
      tools: [{ googleSearch: {} }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });

    // Build the initial prompt with search instructions
    let searchPrompt = `You are a search assistant. Please search for current, real-time information about: ${message}`;
    if (clubName) {
      searchPrompt += ` in the context of ${clubName}`;
    }
    searchPrompt += `\n\nUse the Google Search tool to find the most up-to-date information. Return ONLY the raw search results.`;

    // Get search results
    const searchResponse = await chat.sendMessage(searchPrompt);
    const searchResults = await searchResponse.response;
    
    // Build the main prompt
    let prompt = getWallPrompt(clubName);
    
    if (clubPersona) {
      prompt += `\n\n${clubPersona.personalityPrompt}`;
    }

    prompt += `\n\nIMPORTANT: You are responding in real-time. Today's date is ${new Date().toLocaleDateString()}. Use this current information from my search to answer:

${searchResults.text()}

Now, based on this current information, please answer the user's question: ${message}

Remember to:
1. Use ONLY the current information from the search results
2. Include specific dates and times when relevant
3. Cite your sources
4. Maintain your club persona's personality
5. Be accurate and up-to-date`;

    // Get final response
    const finalResponse = await chat.sendMessage(prompt);
    const response = await finalResponse.response;
    let text = response.text();

    // Clean up any remaining template markers or tool commands
    text = text.replace(/\*\*\[Insert[^\]]+\]\*\*/g, '')  // Remove template markers
             .replace(/\*tool_code[\s\S]*?\*\*/g, '')      // Remove tool code blocks
             .replace(/```[\s\S]*?```/g, '')              // Remove code blocks
             .replace(/\n{3,}/g, '\n\n')                  // Clean up excessive newlines
             .trim();

    // Extract grounding metadata
    let grounding = null;
    if (response.candidates?.[0]?.groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata;
      grounding = {
        sources: (metadata.groundingChunks || []).map(chunk => ({
          title: chunk.web?.title || '',
          url: chunk.web?.uri || '',
          snippet: ''
        })),
        searchQueries: metadata.webSearchQueries || [],
        supports: (metadata.groundingSupports || []).map(support => ({
          text: support.segment?.text || '',
          confidence: Math.max(...(support.confidenceScores || [0]))
        }))
      };
    }

    return {
      text,
      timestamp: new Date().toISOString(),
      grounding,
      error: null,
      clubName: clubPersona?.clubName,
      color: clubPersona?.color
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      text: null,
      timestamp: new Date().toISOString(),
      grounding: null,
      error: error.message || 'Failed to generate response'
    };
  }
}

module.exports = {
  generateResponse
}; 