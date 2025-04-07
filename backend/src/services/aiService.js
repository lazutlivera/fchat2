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

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      tools: useGrounding ? [{ googleSearch: {} }] : undefined
    });

    const chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
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

    // Build the prompt with wall prompts and club persona if available
    let prompt = getWallPrompt(clubName);
    
    if (clubPersona) {
      prompt += `\n\n${clubPersona.personalityPrompt}`;
    }

    // Add grounding instructions if enabled
    if (useGrounding) {
      prompt += `\n\nIMPORTANT: Please use real-time data from web search to answer questions about current events, statistics, or factual information. Your response should be based on the most recent and accurate information available. If you use any information, please cite your sources.`;
    }
    
    prompt += `\n\nUser: ${message}`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract grounding metadata if available
    let grounding = null;
    if (useGrounding && response.candidates?.[0]?.groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata;
      grounding = {
        sources: metadata.webSearchRetrievalResults?.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet
        })) || [],
        searchSuggestions: metadata.webSearchRetrievalResults?.map(result => result.snippet) || []
      };

      // If grounding is enabled but no sources were found, try to search again
      if (grounding.sources.length === 0) {
        const searchResult = await chat.sendMessage(
          `Please search for and provide current, factual information about: ${message}`
        );
        const searchResponse = await searchResult.response;
        const metadata = searchResponse.candidates?.[0]?.groundingMetadata;
        if (metadata?.webSearchRetrievalResults) {
          grounding = {
            sources: metadata.webSearchRetrievalResults.map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.snippet
            })),
            searchSuggestions: metadata.webSearchRetrievalResults.map(result => result.snippet)
          };
        }
      }
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