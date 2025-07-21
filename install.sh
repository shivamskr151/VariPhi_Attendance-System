#!/bin/bash

echo "🚀 Setting up Remote Employee Attendance System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment files
echo "📝 Creating environment files..."

# Server environment
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env"
else
    echo "⚠️  server/.env already exists"
fi

# Client environment
if [ ! -f "client/.env" ]; then
    cp client/.env.example client/.env
    echo "✅ Created client/.env"
else
    echo "⚠️  client/.env already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your environment variables in server/.env and client/.env"
echo "2. Set up MongoDB database"
echo "3. Start the development servers:"
echo "   - npm run dev (starts both server and client)"
echo "   - npm run server:dev (server only)"
echo "   - npm run client:dev (client only)"
echo ""
echo "🌐 The application will be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:5000"
echo ""
echo "📚 For more information, check the README.md file" 