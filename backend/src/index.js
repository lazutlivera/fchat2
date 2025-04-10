const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { generateResponse } = require('./services/aiService');
const { connectToDatabase, createClubPersona, getClubPersona, getAllClubPersonas, getUsageStats } = require('./services/database');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Check environment variables
console.log('Checking environment variables...');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('GOOGLE_GEMINI_API_KEY exists:', !!process.env.GOOGLE_GEMINI_API_KEY);

// Middleware
app.use(cors({
  origin: '*',  // Allow all origins for testing
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Usage statistics endpoint
app.get('/api/usage/stats', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'day';
    const stats = await getUsageStats(timeframe);
    res.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Chat endpoint with grounding
app.post('/api/chat', async (req, res) => {
  try {
    const { message, useGrounding = true } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await generateResponse(message, useGrounding);
    res.json(response);
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Club persona chat endpoint
app.post('/api/chat/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const { message, useGrounding = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate response using club persona from database
    const response = await generateResponse(message, useGrounding, clubName);
    res.json(response);
  } catch (error) {
    console.error('Error in club persona chat endpoint:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Club persona management endpoints
app.post('/api/clubs', async (req, res) => {
  try {
    const { clubName, color, personalityPrompt } = req.body;
    if (!clubName || !color || !personalityPrompt) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const persona = await createClubPersona(clubName, color, personalityPrompt);
    res.status(201).json(persona);
  } catch (error) {
    console.error('Error creating club persona:', error);
    res.status(500).json({ error: 'Failed to create club persona' });
  }
});

app.get('/api/clubs', async (req, res) => {
  console.log('Received request to /api/clubs');
  try {
    console.log('Checking MongoDB connection status:', mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB is not connected. Current state:', mongoose.connection.readyState);
      throw new Error('Database not connected');
    }
    
    console.log('Attempting to fetch club personas');
    const personas = await getAllClubPersonas();
    console.log('Successfully fetched club personas:', personas);
    res.json(personas);
  } catch (error) {
    console.error('Error in /api/clubs endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to get club personas',
      details: error.message 
    });
  }
});

app.get('/api/clubs/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const persona = await getClubPersona(clubName);
    if (!persona) {
      return res.status(404).json({ error: 'Club persona not found' });
    }
    res.json(persona);
  } catch (error) {
    console.error('Error getting club persona:', error);
    res.status(500).json({ error: 'Failed to get club persona' });
  }
});

// Connect to database and start server
connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Health check endpoint: http://localhost:${port}/api/health`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 