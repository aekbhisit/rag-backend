#!/bin/bash

# Start all RAG services with Docker
echo "🚀 Starting all RAG services..."

# Build and start all services
docker-compose up --build -d

echo "✅ All services started!"
echo ""
echo "🌐 Services available at:"
echo "  - Backend API: http://localhost:3002"
echo "  - Admin Web:  http://localhost:3000"
echo "  - Travel Bot: http://localhost:3200"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis:      localhost:6379"
echo "  - MinIO:      http://localhost:9000 (Console: http://localhost:9001)"
echo ""
echo "📊 Check service status:"
echo "  docker-compose ps"
echo ""
echo "📝 View logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "  docker-compose down"
