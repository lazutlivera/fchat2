const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { generateResponse } = require('./services/aiService');
const { connectToDatabase, createClubPersona, getClubPersona, getAllClubPersonas } = require('./services/database');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectToDatabase().catch(console.error);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:19006',
    'http://localhost:3000',
    'http://10.0.2.2:3000',
    'http://192.168.1.100:3000',
    /\.expo\.dev$/,
    /\.expo\.io$/,
    /exp:\/\//
  ],
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
  try {
    const personas = await getAllClubPersonas();
    res.json(personas);
  } catch (error) {
    console.error('Error getting club personas:', error);
    res.status(500).json({ error: 'Failed to get club personas' });
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