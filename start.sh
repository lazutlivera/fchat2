#!/bin/bash

# Start-up script for FChat2 application

# Check if we have the required packages
if ! [ -x "$(command -v node)" ]; then
  echo "Error: nodejs is not installed." >&2
  exit 1
fi

# Parse command line arguments
USE_TUNNEL=false
while getopts ":t" opt; do
  case ${opt} in
    t )
      USE_TUNNEL=true
      ;;
    \? )
      echo "Invalid option: $OPTARG" 1>&2
      ;;
  esac
done

# Print banner
echo "========================================="
echo "  Starting FChat2 Application"
if [ "$USE_TUNNEL" = true ]; then
  echo "  MODE: EXPO TUNNEL"
  echo "  Make sure you've configured your backend"
  echo "  URL in frontend/services/api.js or .env!"
else
  echo "  MODE: LOCAL DEVELOPMENT"
fi
echo "========================================="

# Check if .env exists
if [ ! -f .env ]; then
  echo "WARNING: .env file not found. Creating from example..."
  cp .env.example .env
  echo "Please update the .env file with your actual API keys."
  echo ""
fi

# Check if API key is set
if grep -q "GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here" .env; then
  echo "WARNING: API key not set in .env file."
  echo "Please update the GOOGLE_GEMINI_API_KEY value in the .env file."
  echo ""
fi

# Check for tunnel mode env variables if using tunnel
if [ "$USE_TUNNEL" = true ]; then
  # Check if PUBLIC_BACKEND_URL is set in .env
  if ! grep -q "^PUBLIC_BACKEND_URL=" .env; then
    echo "WARNING: PUBLIC_BACKEND_URL not set in .env file for tunnel mode."
    echo "Adding placeholder - please update with your actual backend URL!"
    echo "PUBLIC_BACKEND_URL=https://your-deployed-backend-url.com" >> .env
  fi
  
  # Set USE_TUNNEL environment variable in .env
  if grep -q "^USE_TUNNEL=" .env; then
    # Update existing USE_TUNNEL value
    sed -i'.bak' 's/^USE_TUNNEL=.*/USE_TUNNEL=true/' .env
    rm -f .env.bak 2>/dev/null || true  # Remove backup file if created
  else
    # Add USE_TUNNEL if not present
    echo "USE_TUNNEL=true" >> .env
  fi
fi

# Try to determine IP address for connecting from physical devices
if [ "$USE_TUNNEL" = false ]; then
  echo "Detecting network configuration..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP_ADDR=$(hostname -I | awk '{print $1}')
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac OSX
    IP_ADDR=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
  else
    # Windows or other
    IP_ADDR=$(ipconfig | grep -i "IPv4 Address" | head -n 1 | awk '{print $NF}')
  fi

  if [ -n "$IP_ADDR" ]; then
    echo "Your IP address appears to be: $IP_ADDR"
    echo "This is what physical devices should use to connect to your backend."
    
    # Create a temporary connection info file
    echo "// Auto-generated connection configuration" > frontend/connectionInfo.js
    echo "export const CONNECTION_INFO = {" >> frontend/connectionInfo.js
    echo "  computerIP: '$IP_ADDR'," >> frontend/connectionInfo.js
    echo "  tunnelMode: false," >> frontend/connectionInfo.js
    echo "  timestamp: '$(date)'" >> frontend/connectionInfo.js
    echo "};" >> frontend/connectionInfo.js
    
    echo "Created connection info file for the frontend."
  else
    echo "Could not detect your IP address. Physical devices may have trouble connecting."
    echo "You might need to manually configure the API URL in frontend/services/api.js"
  fi
else
  echo "Tunnel mode enabled. Will use remote backend URL from .env or app.config.js"
  
  # Get PUBLIC_BACKEND_URL from .env
  PUBLIC_BACKEND_URL=$(grep "^PUBLIC_BACKEND_URL=" .env | cut -d= -f2)
  
  if [ -z "$PUBLIC_BACKEND_URL" ]; then
    echo "WARNING: PUBLIC_BACKEND_URL not found in .env file!"
    PUBLIC_BACKEND_URL="https://YOUR_PUBLIC_BACKEND_URL"
  else
    echo "Using PUBLIC_BACKEND_URL: $PUBLIC_BACKEND_URL"
  fi
  
  # Create a connectionInfo file that indicates tunnel mode
  echo "// Auto-generated connection configuration for tunnel mode" > frontend/connectionInfo.js
  echo "export const CONNECTION_INFO = {" >> frontend/connectionInfo.js
  echo "  computerIP: null," >> frontend/connectionInfo.js
  echo "  tunnelMode: true," >> frontend/connectionInfo.js
  echo "  publicBackendUrl: '$PUBLIC_BACKEND_URL'," >> frontend/connectionInfo.js
  echo "  timestamp: '$(date)'" >> frontend/connectionInfo.js
  echo "};" >> frontend/connectionInfo.js
  
  echo "Created connection info file for tunnel mode."
fi

# Start backend server in background
echo "Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

echo "Backend started with PID: $BACKEND_PID"
echo "Health check endpoint: http://localhost:3000/api/health"
if [ "$USE_TUNNEL" = false ]; then
  echo "External access URL: http://$IP_ADDR:3000/api/health"
fi
echo ""

# Give the backend a moment to start
sleep 3

# Start frontend
echo "Starting Frontend (Expo)..."
cd frontend
if [ "$USE_TUNNEL" = true ]; then
  # Copy environment variables from root .env for Expo
  echo "Copying environment variables for Expo tunnel mode..."
  grep "PUBLIC_BACKEND_URL" ../.env > .env 2>/dev/null || echo "PUBLIC_BACKEND_URL=https://your-deployed-backend-url.com" > .env
  echo "USE_TUNNEL=true" >> .env
  
  echo "Starting Expo with tunnel..."
  export PUBLIC_BACKEND_URL=$(grep "PUBLIC_BACKEND_URL" .env | cut -d= -f2)
  export USE_TUNNEL=true
  npx expo start --tunnel
else
  npx expo start
fi

# When frontend is stopped, kill the backend server
kill $BACKEND_PID
echo "Backend server stopped." 