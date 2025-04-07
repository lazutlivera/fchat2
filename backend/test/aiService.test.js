const { generateResponse } = require('../src/services/aiService');
const axios = require('axios');

// Mock the Google AI client
jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'Manchester United played their last game on Sunday, May 19, 2024 against Brighton & Hove Albion, winning 2-0.\n\nSource: https://www.manutd.com/en/matches/2024/may/19/match-report'
              }],
              role: 'model'
            },
            finishReason: 'STOP',
            groundingMetadata: {
              searchEntryPoint: {
                renderedContent: '<div>Search results</div>'
              },
              groundingChunks: [{
                web: {
                  url: 'https://www.manutd.com/en/matches/2024/may/19/match-report',
                  title: 'Match Report: Manchester United vs Brighton',
                  snippet: 'Match report from the Premier League game at Old Trafford.'
                }
              }]
            }
          }]
        })
      })
    })
  }))
}));

// Mock the database module
jest.mock('../src/services/database', () => ({
  getClubPersona: async (clubName) => {
    if (clubName === 'manutd') {
      return {
        clubName: 'manutd',
        color: '#DA291C',
        personalityPrompt: 'Glory Glory Man United! I am the voice of Manchester United Football Club.'
      };
    }
    return null;
  }
}));

const RENDER_API_URL = 'https://fchat2.onrender.com/api';

describe('AI Service Tests', () => {
  test('should generate response with grounding for simple query', async () => {
    const query = "Who won the last Manchester United game?";
    console.log('\n=== Test 1: Simple Query ===');
    console.log('Query:', query);
    
    const result = await generateResponse(query);
    
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.timestamp).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.grounding).toBeDefined();
    expect(result.grounding.sources).toHaveLength(1);
    expect(result.grounding.sources[0].url).toBe('https://www.manutd.com/en/matches/2024/may/19/match-report');
    expect(result.grounding.sources[0].title).toBe('Match Report: Manchester United vs Brighton');
    expect(result.grounding.sources[0].snippet).toBe('Match report from the Premier League game at Old Trafford.');
    
    // Log the complete result structure
    console.log('\nComplete Result Structure:');
    console.log(JSON.stringify({
      ...result,
      // Exclude text from the log to keep it cleaner
      text: result.text?.substring(0, 100) + '...'
    }, null, 2));
  });

  test('should generate response with grounding for club-specific query', async () => {
    const query = "Who is Manchester United's current manager?";
    console.log('\n=== Test 2: Club-Specific Query ===');
    console.log('Query:', query);
    
    const result = await generateResponse(query, null, "Manchester United");
    
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.timestamp).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.clubName).toBe('Manchester United');
    expect(result.color).toBe('#DA291C');
    expect(result.grounding).toBeDefined();
    expect(result.grounding.sources).toHaveLength(1);
    expect(result.grounding.sources[0].url).toBe('https://www.manutd.com/en/matches/2024/may/19/match-report');
    expect(result.grounding.sources[0].title).toBe('Match Report: Manchester United vs Brighton');
    expect(result.grounding.sources[0].snippet).toBe('Match report from the Premier League game at Old Trafford.');
    
    // Log the complete result structure
    console.log('\nComplete Result Structure:');
    console.log(JSON.stringify({
      ...result,
      // Exclude text from the log to keep it cleaner
      text: result.text?.substring(0, 100) + '...'
    }, null, 2));
  });
});

describe('Live API Tests', () => {
  test('should get real-time response with grounding for football query', async () => {
    const query = "Who won the last Manchester United game?";
    console.log('\n=== Live Test: Recent Match Query ===');
    console.log('Query:', query);
    
    try {
      const response = await axios.post(`${RENDER_API_URL}/chat`, {
        message: query,
        useGrounding: true
      });

      const result = response.data;
      
      console.log('\nAPI Response:');
      console.log(JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeNull();
      
      if (result.grounding) {
        console.log('\nGrounding Sources:');
        result.grounding.sources.forEach(source => {
          console.log(`- ${source.title || 'Untitled'}`);
          console.log(`  URL: ${source.url}`);
          if (source.snippet) {
            console.log(`  Snippet: ${source.snippet}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  }, 30000); // Increased timeout for API call

  test('should get real-time response with grounding for club-specific query', async () => {
    const query = "Who is Manchester United's current manager?";
    const clubName = "manutd";
    console.log('\n=== Live Test: Club Manager Query ===');
    console.log('Query:', query);
    console.log('Club:', clubName);
    
    try {
      const response = await axios.post(`${RENDER_API_URL}/chat/${encodeURIComponent(clubName)}`, {
        message: query,
        useGrounding: true
      });

      const result = response.data;
      
      console.log('\nAPI Response:');
      console.log(JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.clubName).toBe('manutd');
      
      if (result.grounding) {
        console.log('\nGrounding Sources:');
        result.grounding.sources.forEach(source => {
          console.log(`- ${source.title || 'Untitled'}`);
          console.log(`  URL: ${source.url}`);
          if (source.snippet) {
            console.log(`  Snippet: ${source.snippet}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  }, 30000); // Increased timeout for API call
}); 