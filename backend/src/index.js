const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { generateResponse } = require('./services/aiService');
const { connectToDatabase, createClubPersona, getClubPersona, getAllClubPersonas } = require('./services/database');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Check environment variables
console.log('Checking environment variables...');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('GOOGLE_GEMINI_API_KEY exists:', !!process.env.GOOGLE_GEMINI_API_KEY);

// Connect to MongoDB
connectToDatabase()
  .then(async () => {
    // Check if we have any club personas
    const personas = await getAllClubPersonas();
    console.log(`Found ${personas.length} club personas in database`);
    if (personas.length === 0) {
      console.log('No club personas found. You may need to run the seed script.');
    }
  })
  .catch(console.error);

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
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate response using club persona from database
    const response = await generateResponse(message, false, clubName);
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check endpoint: http://localhost:${port}/api/health`);
}); 