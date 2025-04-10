const aiService = require('../services/aiService');

exports.sendMessage = async (req, res) => {
  try {
    const { message, useGrounding, clubName, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await aiService.generateResponse(
      message,
      useGrounding,
      clubName,
      conversationHistory
    );

    res.json(response);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}; 