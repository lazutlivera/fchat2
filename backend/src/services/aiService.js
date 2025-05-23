const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { getClubPersona, logAIUsage } = require('./database');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const RESPONSE_INSTRUCTIONS = `1. Always prioritize using the most recent data from grounding sources
2. For questions about matches, fixtures, or current events, provide specific dates and details
3. Keep responses concise and directly answer the question first
4. Only add historical context if relevant to the current question
5. If the grounding sources provide match/fixture information, always include that in your response`;

async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

function processGroundingMetadata(groundingMetadata) {
  if (!groundingMetadata?.groundingChunks) return null;

  const sources = groundingMetadata.groundingChunks.map(chunk => ({
    url: chunk.web?.uri || '',
    title: chunk.web?.title || 'Source',
    snippet: chunk.web?.snippet || ''
  }));

  return sources.length > 0 ? { sources } : null;
}

async function constructPrompt(message, clubName, conversationHistory = []) {
  const currentDate = new Date().toISOString();

  let historyPrompt = '';
  if (conversationHistory.length > 0) {
    historyPrompt = 'Previous conversation:\n';
    conversationHistory.forEach(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      historyPrompt += `${role}: ${msg.text}\n`;
    });
    historyPrompt += '\n';
  }

  let basePrompt = `Current date and time: ${currentDate}

${historyPrompt}IMPORTANT: For questions about upcoming matches, fixtures, or recent results:
1. ALWAYS check the grounding sources first
2. Provide the EXACT date, time, and opponent from the sources
3. If no specific fixture information is found in grounding, state that clearly
4. Do not include historical information unless specifically asked

User question: ${message}`;

  let persona = RESPONSE_INSTRUCTIONS;

  if (clubName) {
    const clubPersona = await getClubPersona(clubName);
    if (clubPersona) {
      persona = `${clubPersona.personalityPrompt}\n\n${RESPONSE_INSTRUCTIONS}`;
    }
  }

  return {
    basePrompt,
    persona
  };
}

async function generateResponse(message, useGrounding = true, clubName = null, conversationHistory = []) {
  try {
    console.log('Generating response:', { message, useGrounding, clubName, conversationHistory });
    
    const { basePrompt, persona } = await constructPrompt(message, clubName, conversationHistory);
    const promptText = `You are a sports assistant that ALWAYS checks grounding sources for the most up-to-date information.
When asked about fixtures, matches, or results:
1. IMMEDIATELY check the grounding sources
2. Extract and state the EXACT fixture details (date, time, opponent)
3. If no fixture information is found, say "I don't have access to the latest fixture information at the moment"
4. NEVER make up dates or fixtures
5. Keep responses focused and direct

${persona}${basePrompt}`;

    const response = await retryOperation(async () => {
      return await axios.post(
        `${API_URL}?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: promptText
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
    });
    
    console.log('\nAPI Response Structure:');
    console.log('Result:', JSON.stringify(response.data, null, 2));

    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const responseText = response.data.candidates[0].content.parts[0].text;
    const grounding = processGroundingMetadata(response.data.candidates[0].groundingMetadata);


    const inputTokens = Math.ceil(promptText.length / 4); // Rough estimate
    const outputTokens = Math.ceil(responseText.length / 4); // Rough estimate
    const totalTokens = inputTokens + outputTokens;

    await logAIUsage({
      clubName,
      inputTokens,
      outputTokens,
      totalTokens,
      groundingUsed: !!grounding,
      sourceCount: grounding?.sources?.length || 0,
      sources: grounding?.sources || []
    });

    return {
      text: responseText,
      timestamp: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      grounding,
      error: null,
      color: '#DA291C',
      ...(clubName && { clubName })
    };

  } catch (error) {
    console.error('Error generating response:', error);
    return {
      text: null,
      timestamp: new Date().toISOString(),
      grounding: null,
      error: error.message,
      color: '#DA291C'
    };
  }
}

module.exports = {
  generateResponse
}; 