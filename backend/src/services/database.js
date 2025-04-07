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

// Create model
const ClubPersona = mongoose.model('ClubPersona', clubPersonaSchema);

// Database connection function
async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined in environment variables');
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB with URI:', uri.replace(/\/\/[^@]+@/, '//****:****@'));
    
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

module.exports = {
  connectToDatabase,
  createClubPersona,
  getClubPersona,
  getAllClubPersonas,
  updateClubPersona,
  deleteClubPersona
}; 