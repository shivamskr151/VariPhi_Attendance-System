#!/bin/bash

# Docker Start Script for Attendance System
# This script helps you start the application in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    print_success "docker-compose is available"
}

# Function to check available ports
check_ports() {
    local ports=("3000" "5001" "27017")
    local conflicts=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            conflicts+=($port)
        fi
    done
    
    if [ ${#conflicts[@]} -ne 0 ]; then
        print_warning "The following ports are already in use: ${conflicts[*]}"
        print_warning "This might cause conflicts with the Docker containers."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to setup environment file
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success ".env file created from template"
        else
            print_status "Creating basic .env file..."
            cat > .env << EOF
# Database Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=attendance_system
MONGODB_URI=mongodb://admin:password@mongodb:27017/attendance_system?authSource=admin

# Server Configuration
NODE_ENV=development
SERVER_PORT=5001
JWT_SECRET=dev-jwt-secret-key
JWT_EXPIRES_IN=7d

# Client Configuration
CLIENT_URL=http://localhost:3000
CLIENT_PORT=3000
SOCKET_CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@attendance-system.com

# React App Environment Variables
REACT_APP_API_URL=http://localhost:5001
REACT_APP_SOCKET_URL=http://localhost:5001
EOF
            print_success ".env file created"
        fi
        print_warning "Please review and update the .env file with your configuration"
    else
        print_status ".env file already exists"
    fi
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        print_success "Development environment started successfully!"
        echo
        echo "🌐 Access your application:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend API: http://localhost:5001"
        echo "   MongoDB: localhost:27017"
        echo
        echo "📊 View logs: docker-compose -f docker-compose.dev.yml logs -f"
        echo "🛑 Stop services: docker-compose -f docker-compose.dev.yml down"
    else
        print_error "Failed to start services. Check logs with: docker-compose -f docker-compose.dev.yml logs"
        exit 1
    fi
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    docker-compose up --build -d
    
    print_status "Waiting for services to start..."
    sleep 15
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Production environment started successfully!"
        echo
        echo "🌐 Access your application:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend API: http://localhost:5001"
        echo "   With Nginx: http://localhost:80"
        echo
        echo "📊 View logs: docker-compose logs -f"
        echo "🛑 Stop services: docker-compose down"
    else
        print_error "Failed to start services. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Function to stop all containers
stop_all() {
    print_status "Stopping all containers..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    print_success "All containers stopped"
}

# Function to show status
show_status() {
    print_status "Checking container status..."
    echo
    echo "Production containers:"
    docker-compose ps 2>/dev/null || echo "No production containers running"
    echo
    echo "Development containers:"
    docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "No development containers running"
}

# Function to show logs
show_logs() {
    local env=${1:-dev}
    if [ "$env" = "prod" ]; then
        docker-compose logs -f
    else
        docker-compose -f docker-compose.dev.yml logs -f
    fi
}

# Function to show help
show_help() {
    echo "Docker Start Script for Attendance System"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  dev     Start development environment"
    echo "  prod    Start production environment"
    echo "  stop    Stop all containers"
    echo "  status  Show container status"
    echo "  logs    Show logs (dev/prod)"
    echo "  help    Show this help message"
    echo
    echo "Examples:"
    echo "  $0 dev          # Start development environment"
    echo "  $0 prod         # Start production environment"
    echo "  $0 logs prod    # Show production logs"
    echo "  $0 logs dev     # Show development logs"
}

# Main script logic
main() {
    local command=${1:-dev}
    
    case $command in
        "dev")
            check_docker
            check_docker_compose
            check_ports
            setup_env
            start_dev
            ;;
        "prod")
            check_docker
            check_docker_compose
            check_ports
            setup_env
            start_prod
            ;;
        "stop")
            stop_all
            ;;
        "status")
            show_status
            ;;
        "logs")
            local env=${2:-dev}
            show_logs $env
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 