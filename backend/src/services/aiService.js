const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { validateMessage, getWallPrompt } = require('./securityService');
const { getClubPersona } = require('./database');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

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
      tools: [{ googleSearch: {} }]
    });

    // Build search context
    let searchContext = message;
    if (clubName) {
      // Add club context for better search results
      if (message.toLowerCase().includes('next game') || message.toLowerCase().includes('next match')) {
        searchContext = `${clubName} next match fixtures schedule`;
      } else if (message.toLowerCase().includes('manager')) {
        searchContext = `${clubName} current manager`;
      } else {
        searchContext = `${clubName} ${message}`;
      }
    }

    console.log('Search context:', searchContext);

    // Generate content with search
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `You are a football club assistant. Please search for and provide accurate, current information about: ${searchContext}.

Important instructions:
1. Use the Google Search tool to find current information
2. ALWAYS cite your sources with proper links
3. Be specific with dates, times, and facts
4. If you mention a date, verify it's current
5. Format your response in a clear, conversational way
6. Do not use markdown-style links - provide proper source URLs
7. If you're not sure about something, say so

Question: ${message}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    const response = await result.response;
    let text = response.text();

    // Clean up any remaining template markers or tool commands
    text = text.replace(/\*\*\[Insert[^\]]+\]\*\*/g, '')  // Remove template markers
             .replace(/\*tool_code[\s\S]*?\*\*/g, '')      // Remove tool code blocks
             .replace(/```[\s\S]*?```/g, '')              // Remove code blocks
             .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')   // Convert markdown links to text
             .replace(/\n{3,}/g, '\n\n')                  // Clean up excessive newlines
             .trim();

    // Extract grounding metadata
    let grounding = null;
    if (response.candidates?.[0]?.groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata;
      const chunks = metadata.groundingChunks || [];
      const supports = metadata.groundingSupports || [];
      
      // Only include grounding if we have actual sources
      if (chunks.length > 0) {
        grounding = {
          sources: chunks.map(chunk => ({
            title: chunk.web?.title || 'Source',
            url: chunk.web?.uri || '',
            snippet: chunk.web?.snippet || ''
          })).filter(source => source.url),  // Only include sources with URLs
          searchQueries: metadata.webSearchQueries || [],
          supports: supports.map(support => ({
            text: support.segment?.text || '',
            confidence: Math.max(...(support.confidenceScores || [0]))
          }))
        };
      }
    }

    // Add club persona flavor to the response if available
    if (clubPersona) {
      text = `${text}\n\n${clubPersona.personalityPrompt}`;
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