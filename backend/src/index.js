const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

// AI service utility
const aiService = require('./utils/aiService');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Allow requests from development and Expo tunnel domains
const corsOptions = {
  origin: function(origin, callback) {
    // List of allowed domains
    const allowedOrigins = [
      // Local development
      'http://localhost:3000',
      'http://localhost:19000',
      'http://localhost:19006',
      // Android emulator
      'http://10.0.2.2:3000',
      'http://10.0.2.2:19000',
      'http://10.0.2.2:19006',
      // iOS simulator
      'http://127.0.0.1:3000',
      'http://127.0.0.1:19000',
      'http://127.0.0.1:19006',
      // Expo tunnel domains
      /\.expo\.dev$/,
      /\.expo\.io$/,
      /exp:\/\//,
    ];
    
    // No origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check route
app.get('/api/health', async (req, res) => {
  console.log('Health check received');
  
  // Check API key validity using the aiService function
  const isApiKeyValid = aiService.checkApiKey();
  
  if (!isApiKeyValid) {
    return res.status(200).json({ 
      status: 'WARNING', 
      message: 'Server is running but Gemini API key is not configured properly' 
    });
  }
  
  // Optionally test an actual API call
  if (req.query.test === 'true') {
    try {
      // Quick simple text generation to test the API
      const testResponse = await aiService.generateAIResponse('Hello, are you working?');
      
      return res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running with Gemini API functioning correctly',
        testResponse: testResponse.text
      });
    } catch (error) {
      return res.status(200).json({
        status: 'ERROR',
        message: 'Server is running but Gemini API test failed',
        error: error.message
      });
    }
  }
  
  // Default response if not testing
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running with Gemini API configured' 
  });
});

// AI chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Received chat message: ${message}`);
    
    // Generate AI response
    const aiResponse = await aiService.generateAIResponse(message);
    
    // Return response
    res.status(200).json({
      text: aiResponse.text,
      timestamp: aiResponse.timestamp,
      grounding: aiResponse.grounding,
      error: aiResponse.error
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Test API with: http://localhost:${PORT}/api/health?test=true`);
}); 