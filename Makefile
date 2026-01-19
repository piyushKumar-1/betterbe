# BetterBe - Development Commands
# 
# Usage: make <target>

.PHONY: help dev build up down logs clean db-shell api-shell reset

# Default target
help:
	@echo "BetterBe Development Commands"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up        - Start all services (db + api)"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - Follow API logs"
	@echo "  make build     - Rebuild API container"
	@echo "  make clean     - Stop and remove all data"
	@echo "  make reset     - Clean and restart fresh"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start frontend dev server"
	@echo "  make dev-api   - Start API with hot reload (requires cargo-watch)"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell  - Open PostgreSQL shell"
	@echo "  make db-tools  - Start with pgAdmin"
	@echo ""

# ====================
# Docker Commands
# ====================

# Start all services
up:
	docker-compose up -d
	@echo ""
	@echo "✅ Services started!"
	@echo "   API:     http://localhost:3000"
	@echo "   Health:  http://localhost:3000/health"
	@echo ""
	@echo "Run 'make logs' to see API output"

# Stop all services
down:
	docker-compose down

# Follow API logs
logs:
	docker-compose logs -f api

# Rebuild containers
build:
	docker-compose build --no-cache

# Start with pgAdmin for database management
db-tools:
	docker-compose --profile tools up -d
	@echo ""
	@echo "✅ Services started with tools!"
	@echo "   API:     http://localhost:3000"
	@echo "   pgAdmin: http://localhost:5050"
	@echo ""

# Stop and remove all data
clean:
	docker-compose down -v --remove-orphans
	@echo "✅ All containers and volumes removed"

# Clean and restart fresh
reset: clean up

# ====================
# Development
# ====================

# Start frontend dev server
dev:
	npm run dev

# Start API with hot reload (requires cargo-watch)
dev-api:
	cd backend && cargo watch -x run

# ====================
# Database
# ====================

# Open PostgreSQL shell
db-shell:
	docker-compose exec db psql -U betterbe -d betterbe

# ====================
# Production Build
# ====================

# Build production frontend
build-web:
	npm run build

# Build production API image
build-api:
	docker build -t betterbe-api:latest ./backend

# Build Android APK
build-android:
	npm run build:mobile
	npx cap sync android
	cd android && ./gradlew assembleRelease

