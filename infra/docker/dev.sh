#!/bin/bash

# Development Environment Management Script
# This script helps manage the local development environment

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

# Function to check if required files exist
check_files() {
    local missing_files=()
    
    if [[ ! -f "docker-compose.yml" ]]; then
        missing_files+=("docker-compose.yml")
    fi
    
    if [[ ! -f "env.development" ]]; then
        missing_files+=("env.development")
    fi
    
    if [[ ! -f "Dockerfile" ]]; then
        missing_files+=("Dockerfile")
    fi
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing required files: ${missing_files[*]}"
        exit 1
    fi
    
    print_success "All required files found"
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    
    # Copy development environment file
    if [[ ! -f ".env" ]]; then
        cp env.development .env
        print_status "Created .env from env.development"
    fi
    
    # Start services
    docker-compose up -d postgres redis minio
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    print_status "Checking service health..."
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
    else
        print_warning "PostgreSQL might not be ready yet"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is ready"
    else
        print_warning "Redis might not be ready yet"
    fi
    
    # Check MinIO
    if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        print_success "MinIO is ready"
    else
        print_warning "MinIO might not be ready yet"
    fi
    
    print_status "Starting RAG backend application..."
    docker-compose up -d rag-backend
    
    print_status "Waiting for backend to be ready..."
    sleep 10
    
    print_status "Starting frontend applications..."
    docker-compose up -d admin-web travel-ai-bot
    
    print_success "Development environment started!"
    print_status "Services available at:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - MinIO: http://localhost:9000 (Console: http://localhost:9001)"
    echo "  - RAG Backend: http://localhost:3002"
    echo "  - Admin Web UI: http://localhost:3000"
    echo "  - Travel AI Bot: http://localhost:3200"
    echo "  - Health Check: http://localhost:3002/health"
}

# Function to stop development environment
stop_dev() {
    print_status "Stopping development environment..."
    docker-compose down
    print_success "Development environment stopped"
}

# Function to restart development environment
restart_dev() {
    print_status "Restarting development environment..."
    stop_dev
    sleep 2
    start_dev
}

# Function to view logs
logs() {
    local service=${1:-""}
    if [[ -n "$service" ]]; then
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
    else
        print_status "Showing all logs..."
        docker-compose logs -f
    fi
}

# Function to rebuild application
rebuild() {
    local service=${1:-"rag-backend"}
    
    if [[ "$service" == "all" ]]; then
        print_status "Rebuilding all applications..."
        docker-compose build rag-backend admin-web travel-ai-bot
        print_success "All applications rebuilt"
        
        if [[ "$2" == "--restart" ]]; then
            print_status "Restarting all applications..."
            docker-compose up -d rag-backend admin-web travel-ai-bot
            print_success "All applications restarted"
        fi
    else
        print_status "Rebuilding $service application..."
        docker-compose build "$service"
        print_success "Application rebuilt"
        
        if [[ "$2" == "--restart" ]]; then
            print_status "Restarting application..."
            docker-compose up -d "$service"
            print_success "Application restarted"
        fi
    fi
}

# Function to check status
status() {
    print_status "Development environment status:"
    docker-compose ps
    
    echo ""
    print_status "Service health:"
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL: Healthy"
    else
        echo "  ❌ PostgreSQL: Unhealthy"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo "  ✅ Redis: Healthy"
    else
        echo "  ❌ Redis: Unhealthy"
    fi
    
    # Check MinIO
    if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo "  ✅ MinIO: Healthy"
    else
        echo "  ❌ MinIO: Unhealthy"
    fi
    
    # Check RAG Backend
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        echo "  ✅ RAG Backend: Healthy"
    else
        echo "  ❌ RAG Backend: Unhealthy"
    fi
    
    # Check Admin Web UI
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "  ✅ Admin Web UI: Healthy"
    else
        echo "  ❌ Admin Web UI: Unhealthy"
    fi
    
    # Check Travel AI Bot Frontend
    if curl -s http://localhost:3200/ > /dev/null 2>&1; then
        echo "  ✅ Travel AI Bot: Healthy"
    else
        echo "  ❌ Travel AI Bot: Unhealthy"
    fi
}

# Function to clean up
clean() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up development environment..."
        docker-compose down -v --rmi all
        docker system prune -f
        print_success "Cleanup complete"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show help
show_help() {
    echo "Development Environment Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start development environment"
    echo "  stop        Stop development environment"
    echo "  restart     Restart development environment"
    echo "  logs [SERVICE] Show logs (all or specific service)"
    echo "  rebuild [SERVICE] Rebuild application (rag-backend, admin-web, travel-ai-bot, or all)"
    echo "  status      Show environment status"
    echo "  clean       Clean up all containers and volumes"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start all services"
    echo "  $0 logs rag-backend   # Show backend logs"
    echo "  $0 rebuild all        # Rebuild all applications"
    echo "  $0 rebuild travel-ai-bot --restart  # Rebuild and restart travel bot"
}

# Main script logic
main() {
    local command=${1:-"help"}
    
    # Check prerequisites
    check_docker
    check_files
    
    case $command in
        start)
            start_dev
            ;;
        stop)
            stop_dev
            ;;
        restart)
            restart_dev
            ;;
        logs)
            logs "$2"
            ;;
        rebuild)
            rebuild "$2"
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
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
