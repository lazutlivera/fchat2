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

    // Always configure search as a tool
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    // Build search context based on the message
    let searchContext = message;
    if (clubName) {
      searchContext = `${clubName} ${message}`;
    }

    // First, try to get relevant search results
    const searchResult = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `Search for current information about: ${searchContext}` }] 
      }],
      generationConfig: {
        temperature: 0.1,  // Lower temperature for search
        maxOutputTokens: 1024,
      }
    });

    // Build the prompt with wall prompts and club persona
    let prompt = getWallPrompt(clubName);
    
    if (clubPersona) {
      prompt += `\n\n${clubPersona.personalityPrompt}`;
    }
    
    // Add search results and instructions
    prompt += `\n\nIMPORTANT INSTRUCTIONS:
1. Use the following search results to provide accurate, up-to-date information.
2. NEVER show placeholder text like [Insert X Here] or template markers.
3. NEVER show any internal tool commands or code in your response.
4. Always format dates, times, and match information naturally in your response.
5. If you can't find specific information, be honest about it.
6. Maintain your club persona's personality while delivering factual information.
7. Always cite your sources in the response.

Search Results: ${searchResult.response.text()}

User Question: ${message}`;

    // Generate the final response
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
    let text = response.text();

    // Clean up any remaining template markers or tool commands
    text = text.replace(/\*\*\[Insert[^\]]+\]\*\*/g, '')  // Remove template markers
             .replace(/\*tool_code[\s\S]*?\*\*/g, '')      // Remove tool code blocks
             .replace(/```[\s\S]*?```/g, '')              // Remove code blocks
             .replace(/\n{3,}/g, '\n\n')                  // Clean up excessive newlines
             .trim();

    // Extract grounding metadata if available
    let grounding = null;
    if (response.candidates?.[0]?.groundingMetadata) {
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