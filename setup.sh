#!/bin/bash

echo "Setting up FChat2 project..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
  echo "Please update the .env file with your actual API keys."
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "Setup complete! You can now run the project with:"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd frontend && npm start" 