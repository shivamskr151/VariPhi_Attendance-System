# Attendance System Makefile
# A comprehensive Makefile for managing the Remote Employee Attendance System

# Variables
PROJECT_NAME = attendance-system
SERVER_DIR = server
CLIENT_DIR = client
NODE_ENV ?= development
PORT_SERVER ?= 5001
PORT_CLIENT ?= 3001

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "$(PURPLE)================================$(NC)"
	@echo "$(PURPLE)Attendance System Makefile$(NC)"
	@echo "$(PURPLE)================================$(NC)"
	@echo ""
	@echo "$(CYAN)Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make install     # Install all dependencies"
	@echo "  make dev         # Start development servers"
	@echo "  make db-reset    # Reset database"
	@echo "  make clean       # Clean all build artifacts"

# =============================================================================
# INSTALLATION TASKS
# =============================================================================

.PHONY: install
install: ## Install all dependencies (root, server, client)
	@echo "$(BLUE)[INFO]$(NC) Installing all dependencies..."
	@npm install
	@cd $(SERVER_DIR) && npm install
	@cd $(CLIENT_DIR) && npm install
	@echo "$(GREEN)[SUCCESS]$(NC) All dependencies installed"

.PHONY: install-server
install-server: ## Install server dependencies only
	@echo "$(BLUE)[INFO]$(NC) Installing server dependencies..."
	@cd $(SERVER_DIR) && npm install
	@echo "$(GREEN)[SUCCESS]$(NC) Server dependencies installed"

.PHONY: install-client
install-client: ## Install client dependencies only
	@echo "$(BLUE)[INFO]$(NC) Installing client dependencies..."
	@cd $(CLIENT_DIR) && npm install
	@echo "$(GREEN)[SUCCESS]$(NC) Client dependencies installed"

# =============================================================================
# DEVELOPMENT TASKS
# =============================================================================

.PHONY: dev
dev: ## Start development servers (both server and client)
	@echo "$(BLUE)[INFO]$(NC) Starting development servers..."
	@npm run dev

.PHONY: dev-server
dev-server: ## Start server in development mode
	@echo "$(BLUE)[INFO]$(NC) Starting server in development mode..."
	@cd $(SERVER_DIR) && npm run dev

.PHONY: dev-client
dev-client: ## Start client in development mode
	@echo "$(BLUE)[INFO]$(NC) Starting client in development mode..."
	@cd $(CLIENT_DIR) && npm start

.PHONY: start
start: ## Start production server
	@echo "$(BLUE)[INFO]$(NC) Starting production server..."
	@npm start

# =============================================================================
# BUILD TASKS
# =============================================================================

.PHONY: build
build: ## Build both server and client for production
	@echo "$(BLUE)[INFO]$(NC) Building for production..."
	@npm run build

.PHONY: build-server
build-server: ## Build server for production
	@echo "$(BLUE)[INFO]$(NC) Building server..."
	@cd $(SERVER_DIR) && npm run build

.PHONY: build-client
build-client: ## Build client for production
	@echo "$(BLUE)[INFO]$(NC) Building client..."
	@cd $(CLIENT_DIR) && npm run build

# =============================================================================
# DATABASE TASKS
# =============================================================================

.PHONY: db-start
db-start: ## Start MongoDB service
	@echo "$(BLUE)[INFO]$(NC) Starting MongoDB..."
	@brew services start mongodb-community
	@echo "$(GREEN)[SUCCESS]$(NC) MongoDB started"

.PHONY: db-stop
db-stop: ## Stop MongoDB service
	@echo "$(BLUE)[INFO]$(NC) Stopping MongoDB..."
	@brew services stop mongodb-community
	@echo "$(GREEN)[SUCCESS]$(NC) MongoDB stopped"

.PHONY: db-restart
db-restart: ## Restart MongoDB service
	@echo "$(BLUE)[INFO]$(NC) Restarting MongoDB..."
	@brew services restart mongodb-community
	@echo "$(GREEN)[SUCCESS]$(NC) MongoDB restarted"

.PHONY: db-status
db-status: ## Check MongoDB status
	@echo "$(BLUE)[INFO]$(NC) Checking MongoDB status..."
	@brew services list | grep mongodb-community

.PHONY: db-reset
db-reset: ## Reset database (drop and recreate collections)
	@echo "$(YELLOW)[WARNING]$(NC) This will reset the database. Are you sure? [y/N]"
	@read -p "" confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(BLUE)[INFO]$(NC) Resetting database..."
	@cd $(SERVER_DIR) && node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD).then(() => { mongoose.connection.db.dropDatabase().then(() => { console.log('Database reset successfully'); process.exit(0); }).catch(console.error); }).catch(console.error);"
	@echo "$(GREEN)[SUCCESS]$(NC) Database reset complete"

.PHONY: db-seed
db-seed: ## Seed database with sample data
	@echo "$(BLUE)[INFO]$(NC) Seeding database with sample data..."
	@echo "$(BLUE)[INFO]$(NC) Checking MongoDB connection..."
	@mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1 || (echo "$(RED)[ERROR]$(NC) MongoDB is not running. Please start MongoDB first with: make db-start" && exit 1)
	@cd $(SERVER_DIR) && node seedData.js || (echo "$(RED)[ERROR]$(NC) Seeding failed. Check MongoDB connection and try again." && exit 1)

.PHONY: db-reset-seed
db-reset-seed: ## Reset and seed database with sample data
	@echo "$(YELLOW)[WARNING]$(NC) This will reset and seed the database. Are you sure? [y/N]"
	@read -p "" confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(BLUE)[INFO]$(NC) Resetting and seeding database..."
	@echo "$(BLUE)[INFO]$(NC) Checking MongoDB connection..."
	@mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1 || (echo "$(RED)[ERROR]$(NC) MongoDB is not running. Please start MongoDB first with: make db-start" && exit 1)
	@$(MAKE) db-reset
	@$(MAKE) db-seed
	@echo "$(GREEN)[SUCCESS]$(NC) Database reset and seeded successfully"

.PHONY: db-backup
db-backup: ## Create database backup
	@echo "$(BLUE)[INFO]$(NC) Creating database backup..."
	@mkdir -p backups
	@mongodump --uri="$(shell grep MONGODB_URI $(SERVER_DIR)/.env | cut -d '=' -f2)" --out=backups/$(shell date +%Y%m%d_%H%M%S)
	@echo "$(GREEN)[SUCCESS]$(NC) Database backup created"

.PHONY: db-restore
db-restore: ## Restore database from backup
	@echo "$(YELLOW)[WARNING]$(NC) This will restore the database from backup. Are you sure? [y/N]"
	@read -p "" confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(BLUE)[INFO]$(NC) Restoring database from backup..."
	@echo "Please specify backup directory:"
	@read -p "Backup directory: " backup_dir && mongorestore --uri="$(shell grep MONGODB_URI $(SERVER_DIR)/.env | cut -d '=' -f2)" $$backup_dir
	@echo "$(GREEN)[SUCCESS]$(NC) Database restored"

# =============================================================================
# ENVIRONMENT SETUP
# =============================================================================

.PHONY: env-setup
env-setup: ## Setup environment files
	@echo "$(BLUE)[INFO]$(NC) Setting up environment files..."
	@if [ ! -f "$(SERVER_DIR)/.env" ]; then \
		if [ -f "$(SERVER_DIR)/.env.example" ]; then \
			cp $(SERVER_DIR)/.env.example $(SERVER_DIR)/.env; \
			echo "$(GREEN)[SUCCESS]$(NC) Server .env created from template"; \
		else \
			echo "# Server environment variables" > $(SERVER_DIR)/.env; \
			echo "$(GREEN)[SUCCESS]$(NC) Server .env created"; \
		fi; \
	else \
		echo "$(BLUE)[INFO]$(NC) Server .env already exists"; \
	fi
	@if [ ! -f "$(CLIENT_DIR)/.env" ]; then \
		if [ -f "$(CLIENT_DIR)/.env.example" ]; then \
			cp $(CLIENT_DIR)/.env.example $(CLIENT_DIR)/.env; \
			echo "$(GREEN)[SUCCESS]$(NC) Client .env created from template"; \
		else \
			echo "# Client environment variables" > $(CLIENT_DIR)/.env; \
			echo "$(GREEN)[SUCCESS]$(NC) Client .env created"; \
		fi; \
	else \
		echo "$(BLUE)[INFO]$(NC) Client .env already exists"; \
	fi

.PHONY: env-edit-server
env-edit-server: ## Edit server environment file
	@echo "$(BLUE)[INFO]$(NC) Opening server .env file for editing..."
	@if command -v code >/dev/null 2>&1; then \
		code $(SERVER_DIR)/.env; \
	elif command -v nano >/dev/null 2>&1; then \
		nano $(SERVER_DIR)/.env; \
	elif command -v vim >/dev/null 2>&1; then \
		vim $(SERVER_DIR)/.env; \
	else \
		echo "$(YELLOW)[WARNING]$(NC) No editor found. Please edit $(SERVER_DIR)/.env manually"; \
	fi

.PHONY: env-edit-client
env-edit-client: ## Edit client environment file
	@echo "$(BLUE)[INFO]$(NC) Opening client .env file for editing..."
	@if command -v code >/dev/null 2>&1; then \
		code $(CLIENT_DIR)/.env; \
	elif command -v nano >/dev/null 2>&1; then \
		nano $(CLIENT_DIR)/.env; \
	elif command -v vim >/dev/null 2>&1; then \
		vim $(CLIENT_DIR)/.env; \
	else \
		echo "$(YELLOW)[WARNING]$(NC) No editor found. Please edit $(CLIENT_DIR)/.env manually"; \
	fi

# =============================================================================
# TESTING TASKS
# =============================================================================

.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)[INFO]$(NC) Running all tests..."
	@cd $(SERVER_DIR) && npm test
	@cd $(CLIENT_DIR) && npm test

.PHONY: test-server
test-server: ## Run server tests
	@echo "$(BLUE)[INFO]$(NC) Running server tests..."
	@cd $(SERVER_DIR) && npm test

.PHONY: test-client
test-client: ## Run client tests
	@echo "$(BLUE)[INFO]$(NC) Running client tests..."
	@cd $(CLIENT_DIR) && npm test

# =============================================================================
# CLEANUP TASKS
# =============================================================================

.PHONY: clean
clean: ## Clean all build artifacts and node_modules
	@echo "$(BLUE)[INFO]$(NC) Cleaning build artifacts..."
	@rm -rf node_modules
	@rm -rf $(SERVER_DIR)/node_modules
	@rm -rf $(CLIENT_DIR)/node_modules
	@rm -rf $(CLIENT_DIR)/build
	@rm -rf $(SERVER_DIR)/uploads/*
	@echo "$(GREEN)[SUCCESS]$(NC) Cleanup complete"

.PHONY: clean-build
clean-build: ## Clean only build artifacts
	@echo "$(BLUE)[INFO]$(NC) Cleaning build artifacts..."
	@rm -rf $(CLIENT_DIR)/build
	@rm -rf $(SERVER_DIR)/uploads/*
	@echo "$(GREEN)[SUCCESS]$(NC) Build artifacts cleaned"

.PHONY: clean-logs
clean-logs: ## Clean log files
	@echo "$(BLUE)[INFO]$(NC) Cleaning log files..."
	@find . -name "*.log" -type f -delete
	@echo "$(GREEN)[SUCCESS]$(NC) Log files cleaned"

# =============================================================================
# PROCESS MANAGEMENT
# =============================================================================

.PHONY: kill
kill: ## Kill all development processes
	@echo "$(BLUE)[INFO]$(NC) Killing development processes..."
	@pkill -f "nodemon" 2>/dev/null || true
	@pkill -f "react-scripts" 2>/dev/null || true
	@pkill -f "concurrently" 2>/dev/null || true
	@lsof -ti:$(PORT_CLIENT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(PORT_SERVER) | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)[SUCCESS]$(NC) All development processes killed"

.PHONY: status
status: ## Check status of all services
	@echo "$(BLUE)[INFO]$(NC) Checking service status..."
	@echo "$(CYAN)MongoDB:$(NC)"
	@brew services list | grep mongodb-community || echo "MongoDB not found"
	@echo "$(CYAN)Port $(PORT_SERVER) (Server):$(NC)"
	@lsof -i:$(PORT_SERVER) >/dev/null 2>&1 && echo "Running" || echo "Not running"
	@echo "$(CYAN)Port $(PORT_CLIENT) (Client):$(NC)"
	@lsof -i:$(PORT_CLIENT) >/dev/null 2>&1 && echo "Running" || echo "Not running"

# =============================================================================
# UTILITY TASKS
# =============================================================================

.PHONY: logs
logs: ## Show server logs
	@echo "$(BLUE)[INFO]$(NC) Showing server logs..."
	@cd $(SERVER_DIR) && npm run dev

.PHONY: shell
shell: ## Open MongoDB shell
	@echo "$(BLUE)[INFO]$(NC) Opening MongoDB shell..."
	@mongosh

.PHONY: backup
backup: ## Create full project backup
	@echo "$(BLUE)[INFO]$(NC) Creating project backup..."
	@mkdir -p backups
	@tar -czf backups/$(PROJECT_NAME)_$(shell date +%Y%m%d_%H%M%S).tar.gz --exclude=node_modules --exclude=backups --exclude=.git .
	@echo "$(GREEN)[SUCCESS]$(NC) Project backup created"

.PHONY: setup
setup: ## Complete project setup (install + env + db)
	@echo "$(BLUE)[INFO]$(NC) Setting up complete project..."
	@$(MAKE) install
	@$(MAKE) env-setup
	@$(MAKE) db-start
	@echo "$(GREEN)[SUCCESS]$(NC) Project setup complete"
	@echo "$(CYAN)Next steps:$(NC)"
	@echo "1. Configure environment variables: make env-edit-server"
	@echo "2. Start development servers: make dev"

# =============================================================================
# DEPLOYMENT TASKS
# =============================================================================

.PHONY: deploy-prep
deploy-prep: ## Prepare for deployment
	@echo "$(BLUE)[INFO]$(NC) Preparing for deployment..."
	@$(MAKE) build
	@$(MAKE) test
	@echo "$(GREEN)[SUCCESS]$(NC) Deployment preparation complete"

.PHONY: deploy
deploy: ## Deploy to production (placeholder)
	@echo "$(YELLOW)[WARNING]$(NC) Deployment not configured. Please implement deployment logic."

# =============================================================================
# MONITORING TASKS
# =============================================================================

.PHONY: monitor
monitor: ## Monitor system resources
	@echo "$(BLUE)[INFO]$(NC) Monitoring system resources..."
	@echo "$(CYAN)CPU Usage:$(NC)"
	@top -l 1 | grep "CPU usage" || echo "CPU info not available"
	@echo "$(CYAN)Memory Usage:$(NC)"
	@top -l 1 | grep "PhysMem" || echo "Memory info not available"
	@echo "$(CYAN)Disk Usage:$(NC)"
	@df -h | grep -E "(Filesystem|/dev/disk)" | head -5

.PHONY: health
health: ## Check application health
	@echo "$(BLUE)[INFO]$(NC) Checking application health..."
	@curl -s http://localhost:$(PORT_SERVER)/api/health || echo "$(RED)[ERROR]$(NC) Server not responding"
	@curl -s http://localhost:$(PORT_CLIENT) >/dev/null && echo "$(GREEN)[SUCCESS]$(NC) Client responding" || echo "$(RED)[ERROR]$(NC) Client not responding" 

# Docker Daemon Check Macro
DOCKER_DAEMON_CHECK = @docker info >/dev/null 2>&1 || (echo "$(RED)[ERROR]$(NC) Docker is not running. Please start Docker Desktop." && exit 1)

.PHONY: docker-up
docker-up: ## Start all Docker containers
	$(DOCKER_DAEMON_CHECK)
	docker compose up -d

.PHONY: docker-down
docker-down: ## Stop all Docker containers
	$(DOCKER_DAEMON_CHECK)
	docker compose down 