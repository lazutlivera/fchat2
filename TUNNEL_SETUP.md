# Setting Up a Public Backend for Expo Tunnel

This guide will help you deploy your backend to a public server so it can be accessed when using Expo tunnel for your frontend.

## Options for Deploying Your Backend

### Option 1: Using a Free Cloud Provider (Recommended for Quick Testing)

#### Render.com (Free tier available)

1. **Create an account** at [render.com](https://render.com)

2. **Create a new Web Service**
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or use the "Manual Deploy" option
   - Select the repository with your backend code

3. **Configure the service**
   - Name: `fchat2-backend` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run start`
   - Select the free plan

4. **Add Environment Variables**
   - Click on "Environment" tab
   - Add your `GOOGLE_GEMINI_API_KEY` with your actual API key
   - Add `NODE_ENV=production`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Note your service URL (e.g., `https://fchat2-backend.onrender.com`)

### Option 2: Using Railway.app (Credit card required, but generous free tier)

1. **Create an account** at [railway.app](https://railway.app)

2. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub repository with the backend code

3. **Configure Environment Variables**
   - Navigate to the "Variables" tab
   - Add your `GOOGLE_GEMINI_API_KEY` with your actual API key
   - Add `NODE_ENV=production`

4. **Verify deployment**
   - Check the "Deployments" tab to ensure your service is running
   - Note your service URL

### Option 3: Using Netlify Functions (Free tier available)

Netlify Functions can be used to host your backend as serverless functions.

1. **Create a `netlify.toml` file** in your project root:
   ```toml
   [build]
     functions = "netlify/functions"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Create a function file** at `netlify/functions/api.js`:
   ```javascript
   const express = require('express');
   const serverless = require('serverless-http');
   const app = express();
   
   // Import your backend code
   const apiService = require('../../backend/src/utils/aiService');
   
   // Set up your middleware and routes similar to your backend/src/index.js
   app.use(express.json());
   
   app.get('/api/health', (req, res) => {
     res.status(200).json({ status: 'OK', message: 'Server is running' });
   });
   
   app.post('/api/chat', async (req, res) => {
     try {
       const { message } = req.body;
       const aiResponse = await apiService.generateAIResponse(message);
       res.status(200).json(aiResponse);
     } catch (error) {
       res.status(500).json({ error: 'Failed to process message' });
     }
   });
   
   // Export the handler
   module.exports.handler = serverless(app);
   ```

3. **Deploy to Netlify**
   - Push your code to GitHub
   - Connect your repository to Netlify
   - Add your environment variables in the Netlify dashboard
   - Deploy your site

## Updating Your Frontend Code

Once you have your backend deployed to a public URL, update the `tunnelMode` URL in `frontend/services/api.js`:

```javascript
const API_URLS = {
  // ... other URLs
  tunnelMode: 'https://your-deployed-backend-url.com'  // Replace with your actual URL
};
```

## Security Considerations

When deploying your backend publicly:

1. **API Key Protection**:
   - Never commit your API key to your repository
   - Always use environment variables for sensitive information
   - Consider adding rate limiting to prevent abuse

2. **CORS Configuration**:
   - Update your CORS settings to allow requests only from your Expo app's domain
   - In your backend/src/index.js, update the corsOptions:
   ```javascript
   const corsOptions = {
     origin: [
       'https://your-expo-app-url.exp.dev',
       // Include localhost/development URLs too
       'http://localhost:3000',
       'http://localhost:19000',
       'http://localhost:19006'
     ],
     methods: ['GET', 'POST'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   };
   ```

3. **Authentication**:
   - Consider adding simple authentication to your backend
   - Even a basic API key in request headers can help prevent unauthorized use

## Testing Your Setup

1. **Verify backend is accessible**:
   - Visit `https://your-backend-url.com/api/health` in your browser
   - You should see a JSON response with `{ "status": "OK", ... }`

2. **Start your frontend with Expo tunnel**:
   ```bash
   cd frontend
   npx expo start --tunnel
   ```

3. **Open the app** using the QR code provided by Expo
   - The app should connect to your public backend
   - You should be able to send messages and receive responses

## Troubleshooting

- **CORS errors**: Check your CORS settings on the backend
- **Connection failed**: Verify your backend URL is correct and the server is running
- **API key issues**: Make sure your environment variables are set correctly on your hosting provider 