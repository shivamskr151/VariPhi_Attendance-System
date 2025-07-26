#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Environment Configuration Setup${NC}"
echo ""

# Check if root .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating root .env file...${NC}"
    cat > .env << 'EOF'
# ========================================
# Centralized Configuration for Attendance System
# ========================================

# Port Configuration
CLIENT_PORT=3001
SERVER_PORT=5001

# URL Configuration
CLIENT_URL=http://localhost:3001
SERVER_URL=http://localhost:5001
API_URL=http://localhost:5001/api

# Environment
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/attendance_system

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Geolocation Settings
MAX_DISTANCE_KM=100
DEFAULT_LOCATION_LAT=0
DEFAULT_LOCATION_LNG=0
LOCATION_VALIDATION_ENABLED=false

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=variphi.info@gmail.com
EMAIL_PASS=Nextneural@2402S
EMAIL_FROM=information@variphi.com

# File Upload
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Socket Configuration
SOCKET_CORS_ORIGIN=http://localhost:3001
EOF
    echo -e "${GREEN}✅ Root .env file created${NC}"
else
    echo -e "${GREEN}✅ Root .env file already exists${NC}"
fi

# Update server .env
echo -e "${YELLOW}Updating server .env...${NC}"
cat > server/.env << 'EOF'
# Server Configuration
PORT=${SERVER_PORT:-5001}
NODE_ENV=development

# Client Configuration
CLIENT_PORT=${CLIENT_PORT:-3001}
CLIENT_URL=${CLIENT_URL:-http://localhost:3001}

# Database
MONGODB_URI=mongodb://localhost:27017/attendance_system

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Geolocation Settings
MAX_DISTANCE_KM=100
DEFAULT_LOCATION_LAT=0
DEFAULT_LOCATION_LNG=0
LOCATION_VALIDATION_ENABLED=false

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=variphi.info@gmail.com
EMAIL_PASS=Nextneural@2402S
EMAIL_FROM=information@variphi.com

# Frontend URL (for invitation links)
FRONTEND_URL=${CLIENT_URL:-http://localhost:3001}

# File Upload
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Socket Configuration
SOCKET_CORS_ORIGIN=${CLIENT_URL:-http://localhost:3001}
EOF
echo -e "${GREEN}✅ Server .env updated${NC}"

# Update client .env
echo -e "${YELLOW}Updating client .env...${NC}"
cat > client/.env << 'EOF'
# Port Configuration
PORT=${CLIENT_PORT:-3001}
SERVER_PORT=${SERVER_PORT:-5001}
REACT_APP_SERVER_PORT=${SERVER_PORT:-5001}

# API Configuration
REACT_APP_API_URL=${API_URL:-http://localhost:5001/api}
REACT_APP_FRONTEND_URL=${CLIENT_URL:-http://localhost:3001}
REACT_APP_BACKEND_URL=${SERVER_URL:-http://localhost:5001}
REACT_APP_SOCKET_URL=${SERVER_URL:-http://localhost:5001}

# App Configuration
REACT_APP_NAME=Remote Attendance System
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_GEOLOCATION=true
REACT_APP_ENABLE_REAL_TIME=true

# External Services (if needed)
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_SENTRY_DSN=your-sentry-dsn

# Development
REACT_APP_DEBUG=true
EOF
echo -e "${GREEN}✅ Client .env updated${NC}"

echo ""
echo -e "${GREEN}🎉 Environment configuration setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Current Configuration:${NC}"
echo -e "  Client Port: ${CLIENT_PORT:-3001}"
echo -e "  Server Port: ${SERVER_PORT:-5001}"
echo -e "  Client URL: ${CLIENT_URL:-http://localhost:3001}"
echo -e "  Server URL: ${SERVER_URL:-http://localhost:5001}"
echo ""
echo -e "${YELLOW}💡 To change ports, edit the root .env file and run this script again${NC}" 