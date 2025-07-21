#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to cleanup processes
cleanup() {
    print_status "Cleaning up processes..."
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "concurrently" 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Trap to cleanup on exit
trap cleanup EXIT

print_header "🚀 Remote Employee Attendance System Startup"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check for required tools
print_status "Checking required tools..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists brew; then
    print_error "Homebrew is not installed. Please install Homebrew first."
    exit 1
fi

print_success "Required tools are available"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Cleanup existing processes
cleanup

# Check and start MongoDB
print_status "Checking MongoDB status..."
if ! brew services list | grep -q "mongodb-community.*started"; then
    print_warning "MongoDB is not running. Starting MongoDB..."
    brew services start mongodb-community
    sleep 5
    
    # Verify MongoDB started
    if ! brew services list | grep -q "mongodb-community.*started"; then
        print_error "Failed to start MongoDB. Please start it manually: brew services start mongodb-community"
        exit 1
    fi
fi

print_success "MongoDB is running"

# Setup environment files
print_status "Setting up environment files..."

# Server .env
if [ ! -f "server/.env" ]; then
    print_warning "Creating server .env file from template..."
    cp server/.env.example server/.env
    print_success "Server .env file created"
else
    print_success "Server .env file already exists"
fi

# Client .env
if [ ! -f "client/.env" ]; then
    print_warning "Creating client .env file from template..."
    cp client/.env.example client/.env 2>/dev/null || echo "# Client environment variables" > client/.env
    print_success "Client .env file created"
else
    print_success "Client .env file already exists"
fi

# Install dependencies
print_status "Installing dependencies..."

# Root dependencies
if [ ! -d "node_modules" ]; then
    print_status "Installing root dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install root dependencies"
        exit 1
    fi
fi

# Server dependencies
if [ ! -d "server/node_modules" ]; then
    print_status "Installing server dependencies..."
    cd server && npm install && cd ..
    if [ $? -ne 0 ]; then
        print_error "Failed to install server dependencies"
        exit 1
    fi
fi

# Client dependencies
if [ ! -d "client/node_modules" ]; then
    print_status "Installing client dependencies..."
    cd client && npm install && cd ..
    if [ $? -ne 0 ]; then
        print_error "Failed to install client dependencies"
        exit 1
    fi
fi

print_success "All dependencies installed"

# Create uploads directory if it doesn't exist
if [ ! -d "server/uploads" ]; then
    print_status "Creating uploads directory..."
    mkdir -p server/uploads
    print_success "Uploads directory created"
fi

# Start the development servers
print_status "Starting development servers..."
print_status "This may take a few moments..."

# Start servers in background
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

# Wait for servers to start
sleep 10

# Check if the process is still running
if ! kill -0 $DEV_PID 2>/dev/null; then
    print_error "Development servers failed to start"
    exit 1
fi

# Wait for services to be ready
if wait_for_service "http://localhost:3000" "Frontend"; then
    print_success "Frontend is running at http://localhost:3000"
else
    print_error "Frontend failed to start"
    exit 1
fi

if wait_for_service "http://localhost:5001/api/health" "Backend"; then
    print_success "Backend is running at http://localhost:5001"
else
    print_error "Backend failed to start"
    exit 1
fi

echo ""
print_header "🎉 VariPhi Attendance System is Ready!"
echo ""
echo -e "${GREEN}✅ Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}✅ Backend API:${NC} http://localhost:5001"
echo -e "${GREEN}✅ Health Check:${NC} http://localhost:5001/api/health"
echo ""
echo -e "${CYAN}📱 You can now access the application in your browser${NC}"
echo -e "${CYAN}🔧 API documentation and endpoints are available at the backend URL${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Keep the script running and monitor processes
while kill -0 $DEV_PID 2>/dev/null; do
    sleep 5
done

print_error "Development servers stopped unexpectedly"
exit 1 