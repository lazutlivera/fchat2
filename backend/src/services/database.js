const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Club persona schema
const clubPersonaSchema = new mongoose.Schema({
  clubName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  personalityPrompt: {
    type: String,
    required: true,
    trim: true
  }
});

// AI Usage tracking schema
const aiUsageSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  clubName: {
    type: String,
    required: false
  },
  inputTokens: {
    type: Number,
    required: true
  },
  outputTokens: {
    type: Number,
    required: true
  },
  totalTokens: {
    type: Number,
    required: true
  },
  groundingUsed: {
    type: Boolean,
    required: true
  },
  sourceCount: {
    type: Number,
    default: 0
  },
  sources: [{
    url: String,
    title: String,
    snippet: String
  }]
});

// Create models
const ClubPersona = mongoose.model('ClubPersona', clubPersonaSchema);
const AIUsage = mongoose.model('AIUsage', aiUsageSchema);

// Database connection function
async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined in environment variables');
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', uri.replace(/\/\/[^@]+@/, '//****:****@'));
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// CRUD operations for club personas
async function createClubPersona(clubName, color, personalityPrompt) {
  try {
    const persona = new ClubPersona({
      clubName,
      color,
      personalityPrompt
    });
    await persona.save();
    return persona;
  } catch (error) {
    console.error('Error creating club persona:', error);
    throw error;
  }
}

async function getClubPersona(clubName) {
  try {
    return await ClubPersona.findOne({ clubName });
  } catch (error) {
    console.error('Error getting club persona:', error);
    throw error;
  }
}

async function getAllClubPersonas() {
  try {
    console.log('Attempting to fetch all club personas');
    const personas = await ClubPersona.find({});
    console.log(`Successfully fetched ${personas.length} club personas`);
    return personas;
  } catch (error) {
    console.error('Error getting all club personas:', error);
    throw error;
  }
}

async function updateClubPersona(clubName, updates) {
  try {
    return await ClubPersona.findOneAndUpdate(
      { clubName },
      { $set: updates },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating club persona:', error);
    throw error;
  }
}

async function deleteClubPersona(clubName) {
  try {
    return await ClubPersona.findOneAndDelete({ clubName });
  } catch (error) {
    console.error('Error deleting club persona:', error);
    throw error;
  }
}

// AI Usage tracking functions
async function logAIUsage(usageData) {
  try {
    const usage = new AIUsage(usageData);
    await usage.save();
    return usage;
  } catch (error) {
    console.error('Error logging AI usage:', error);
    throw error;
  }
}

async function getUsageStats(timeframe = 'day') {
  try {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const stats = await AIUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          totalRequests: { $sum: 1 },
          groundingRequests: {
            $sum: { $cond: [{ $eq: ['$groundingUsed', true] }, 1, 0] }
          },
          totalSources: { $sum: '$sourceCount' }
        }
      }
    ]);

    return stats[0] || {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalRequests: 0,
      groundingRequests: 0,
      totalSources: 0
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  createClubPersona,
  getClubPersona,
  getAllClubPersonas,
  updateClubPersona,
  deleteClubPersona,
  logAIUsage,
  getUsageStats
}; 