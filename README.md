# FChat2 - AI-powered Chat Application

A mobile application built with Expo, React Native, and JavaScript that leverages Google's Gemini 2.0 Flash model with Search grounding for more accurate, up-to-date, and source-backed AI chat responses.

## Key Features

- **Gemini 2.0 Flash Model**: Uses Google's latest AI model for fast, accurate responses
- **Google Search Grounding**: Enhances responses with real-time information from the web
- **Source Citations**: Displays the sources used to ground AI responses for transparency
- **Search Suggestions**: Provides related search queries for further exploration
- **Cross-platform**: Works on iOS, Android and web platforms via Expo/React Native

## Running Modes

This application supports two running modes:

1. **Local Development Mode** (default): 
   - Backend runs on your local machine
   - Frontend connects to your computer's IP address
   - Good for development and testing on local network

2. **Tunnel Mode**:
   - Backend is deployed to a public URL
   - Frontend uses Expo tunnel to run on Expo's servers
   - Allows testing on devices anywhere, not just your local network
   - See [TUNNEL_SETUP.md](TUNNEL_SETUP.md) for deployment instructions

## Project Structure

```
root
│ .env                # Environment variables
│ .env.example        # Template for environment variables
│ README.md           # This file
│ setup.sh            # Setup script
│ start.sh            # Start both backend and frontend
│ TUNNEL_SETUP.md     # Guide for setting up tunnel mode
│
├─ backend/           # Server-side code and API
│  ├─ src/
│  │  ├─ index.js     # Main server file
│  │  └─ utils/       # Utility functions
│  │     └─ aiService.js # AI integration service
│  └─ package.json
│
└─ frontend/          # Expo/React Native mobile application
   ├─ App.js          # Entry point
   ├─ services/       # API services
   │  └─ api.js       # API client
   └─ package.json
```

## Prerequisites

- Node.js (LTS version)
- npm or yarn
- Expo CLI
- A mobile device or simulator
- A Google Gemini API key ([Get one here](https://ai.google.dev/tutorials/setup))

## Setup Instructions

### Option 1: Using the Setup Script (Recommended)

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd fchat2
   ```

2. **Run the setup script**
   ```
   ./setup.sh
   ```

3. **Update the .env file with your API key**
   ```
   GOOGLE_GEMINI_API_KEY=your_api_key_here
   ```

## Running the Application

### Option 1: Local Development Mode (Default)

```bash
# Start both backend and frontend in local mode
./start.sh
```

### Option 2: Tunnel Mode (For remote testing)

```bash
# To use tunnel mode, you first need to:
# 1. Deploy your backend (see TUNNEL_SETUP.md)
# 2. Update tunnelMode URL in frontend/services/api.js

# Then start the app with tunnel flag
./start.sh -t
```

## Google Search Grounding

This application uses the Gemini 2.0 Flash model with Google Search grounding to provide accurate, up-to-date responses with source citations. When the model determines it needs additional information from the web to answer a question, it automatically searches for relevant content and includes those sources in its response.

### How it Works:

1. User sends a message to the AI
2. The backend forwards this to the Gemini 2.0 Flash model with Search tools enabled
3. Gemini determines if web information would help answer the query
4. If needed, it performs searches and grounds its responses in the results
5. The response is returned with source URLs and search suggestions
6. The frontend displays these sources, allowing users to explore further

This integration ensures responses are:
- Factual and up-to-date
- Transparent about information sources
- Backed by reliable web content

For more details, refer to the [Google Search Grounding documentation](https://ai.google.dev/gemini-api/docs/grounding).

## Troubleshooting

See the detailed troubleshooting section in the full documentation for common issues and solutions. 