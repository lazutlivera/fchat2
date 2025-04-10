const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./services/database');
const chatRoutes = require('./routes/chat');
const clubRoutes = require('./routes/clubs');
const usageRoutes = require('./routes/usage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/usage', usageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to database and start server
const PORT = process.env.PORT || 3000;
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

module.exports = app; 