# Project Build Instructions

This document provides an overview and step-by-step instructions for building and maintaining this AI-based mobile application with Expo, React Native, and JavaScript. The primary AI integrations include Gemini and Google Grounding. Refer to our `.cursorrules` file for coding guidelines and additional policies.

---

## Table of Contents

1. [Prerequisites](#prerequisites)  
2. [Project Structure](#project-structure)  
3. [Installation & Setup](#installation--setup)  
4. [Environment Variables](#environment-variables)  
5. [Running the Project](#running-the-project)  
6. [AI Integration](#ai-integration)  
7. [Testing](#testing)  
8. [Contributing & Versioning](#contributing--versioning)

---

## Prerequisites

- **Node.js** (LTS recommended)
- **npm** or **yarn** (prefer whichever the team has standardized on)
- **Expo CLI** (installed globally)  
  \```bash
  npm install --global expo-cli
  \```
- **Git** (for version control)
- **A mobile device or simulator** (iOS Simulator, Android Emulator, or a physical device)
- **An understanding of React Native** and JavaScript fundamentals

---

## Project Structure

The repository is divided into separate folders to keep concerns isolated:
root │ .cursorrules │ .env ├─ backend/ │ ├─ src/ │ └─ ... ├─ frontend/ │ ├─ App.js │ ├─ package.json │ └─ ... └─ README.md

markdown
Copy
Edit

1. **backend/**: Contains server-side code, APIs, and any AI-specific server logic if applicable.  
2. **frontend/**: Houses all mobile application code, including Expo, React Native components, screens, and navigation.  
3. **.env**: A single environment file for both backend and frontend configuration (keep sensitive data here).  
4. **.cursorrules**: Outlines the code style, naming conventions, and design principles to follow.

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourorg/yourapp.git
   cd yourapp
Install frontend dependencies:

bash
Copy
Edit
cd frontend
npm install
# or
yarn
Install backend dependencies:

bash
Copy
Edit
cd ../backend
npm install
# or
yarn
Environment Variables
A single .env file at the root of the project manages environment-specific settings. For example:

ini
Copy
Edit
# EXAMPLE: Replace with your actual keys
API_BASE_URL=http://localhost:3000
GOOGLE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GOOGLE_GROUNDING_API_KEY=YOUR_GROUNDING_API_KEY
Never commit real production secrets to version control.

If needed, create local variants like .env.local for personal development, but ensure you do not replicate multiple environment files with conflicting settings.

Running the Project
Start the backend (in a new terminal window/tab):

bash
Copy
Edit
cd backend
npm run start
Start the frontend (in another terminal window/tab):

bash
Copy
Edit
cd frontend
npm run start
# or expo start
Open the Expo app on your phone or in a simulator.

Verify connectivity: The frontend should be able to communicate with the backend using the environment variables defined in .env.

AI Integration
The AI services (Gemini and Google Grounding) are used to facilitate chat interactions with clubs or other domain-specific content.

Gemini API: Refer to the Gemini documentation for setting up calls and handling responses.

Google Grounding: Integrates with Gemini to enhance context-based chat. Make sure you configure the proper keys in .env.

Example usage:

js
Copy
Edit
// In your backend or dedicated AI service file:
import axios from "axios";

async function getClubChatResponse(userMessage) {
  const response = await axios.post(
    'https://ai.google.dev/gemini-api/grounding', 
    {
      message: userMessage
      // additional payload data as needed
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GOOGLE_GEMINI_API_KEY}`,
        // ...
      }
    }
  );
  
  return response.data;
}
Keep all AI logic in one place to simplify maintenance and minimize duplication.

Testing
Unit Tests: Ensure all new code is accompanied by corresponding tests (e.g., Jest in the frontend, your preferred test framework in the backend).

Integration & E2E: If you have integration or end-to-end tests, run them as part of your CI/CD pipeline or manually:

bash
Copy
Edit
npm run test
Incremental Testing: Each small feature or fix should include or update test coverage according to our .cursorrules guidelines.

Contributing & Versioning
Small Increments: Break changes into small, reviewable PRs.

Preserve Core Functionality: Avoid altering stable features unnecessarily.

Branching: Use a Git branching strategy that suits your team (e.g., feature branches merged into main via pull requests).

Versioning: Follow semantic versioning if you plan official releases.

For more detail, refer to the custom.mdc file in the rules.