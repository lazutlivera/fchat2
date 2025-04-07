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

    // Configure the model with search as a tool
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: useGrounding ? [{ googleSearch: {} }] : undefined
    });

    // Build the prompt with wall prompts and club persona if available
    let prompt = getWallPrompt(clubName);
    
    if (clubPersona) {
      prompt += `\n\n${clubPersona.personalityPrompt}`;
    }
    
    // Add search instruction for factual queries
    if (useGrounding) {
      prompt += `\n\nIMPORTANT: For any factual information about current events, statistics, or real-world data, please use the Google Search tool to find and cite the most up-to-date information. Always include your sources.`;
    }
    
    prompt += `\n\nUser: ${message}`;

    // Generate content with search capability
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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

    const response = await result.response;
    const text = response.text();

    // Extract grounding metadata if available
    let grounding = null;
    if (useGrounding && response.candidates?.[0]?.groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata;
      if (metadata.webSearchQueries && metadata.groundingSupports) {
        grounding = {
          sources: metadata.groundingChunks?.map(chunk => ({
            title: chunk.web?.title || '',
            url: chunk.web?.uri || '',
            snippet: ''
          })) || [],
          searchQueries: metadata.webSearchQueries || [],
          supports: metadata.groundingSupports?.map(support => ({
            text: support.segment?.text || '',
            confidence: Math.max(...(support.confidenceScores || [0]))
          })) || []
        };
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