# Docker Configuration

## Overview
This directory contains Docker configurations for the RAG Backend system.

---

## Files Structure

### Main Docker Compose Files

#### 1. `docker-compose.production.yml` 
**Use for**: Production deployment  
**Description**: Complete production setup with security, resource limits, and health checks

```bash
# Build all services
docker compose -f docker-compose.production.yml build --no-cache

# Start all services
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps
```

#### 2. `docker-compose.dev.yml`
**Use for**: Local development  
**Description**: Simplified setup for local development

```bash
# Start for development
docker compose -f docker-compose.dev.yml up -d
```

---

### Dockerfiles

#### Application Dockerfiles (in apps/):
- `../../apps/backend/Dockerfile` - Backend API
- `../../apps/admin-web/Dockerfile` - Admin Web UI
- `../../apps/travel-ai-bot/Dockerfile` - Travel AI Bot UI

#### Infrastructure Dockerfiles (in infra/docker/):
- `Dockerfile` - Main backend build (used by docker-compose)
- `Dockerfile.dev` - Development version with hot reload
- `postgres/Dockerfile` - PostgreSQL with PostGIS + pgvector
- `postgres/Dockerfile.custom` - Alternative postgres build (if needed)

---

## Quick Start

### Production Deployment:
```bash
cd /home/rag-backend/infra/docker

# Set up permissions first (IMPORTANT!)
sudo chown -R 999:999 ./data/postgres
sudo chmod -R 700 ./data/postgres
sudo chown -R 999:999 ./data/redis
sudo chmod -R 755 ./data/redis

# Build and start
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d

# Verify
docker ps
docker logs rag-backend --tail 50
curl http://localhost:3001/health
```

### Local Development:
```bash
cd /path/to/rag-backend/infra/docker

# Start services
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

---

## Services

### Production Services:
1. **rag-backend** - Port 3001 - Backend API
2. **rag-admin-web** - Port 3000 - Admin UI (internal)
3. **rag-travel-ai-bot** - Port 3200 - AI Chat UI
4. **rag-postgres** - Port 5432 (internal) - PostgreSQL + PostGIS + pgvector
5. **rag-redis** - Port 6379 (internal) - Redis cache
6. **rag-minio** - Port 9000 - MinIO object storage

### Data Persistence:
All data stored in `./data/`:
- `./data/postgres/` - PostgreSQL data
- `./data/redis/` - Redis persistence
- `./data/minio/` - MinIO object storage
- `./data/logs/` - Application logs
- `./data/uploads/` - File uploads
- `./data/backups/` - Database backups

---

## Environment Variables

Copy `.env.example` to `.env.prod` and configure:

```bash
# Database
POSTGRES_DB=rag_backend
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=<secure_password>

# Redis
REDIS_PASSWORD=<secure_password>

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<secure_password>

# JWT
JWT_SECRET=<secure_random_string>

# Tenant & Admin (Bootstrap)
TENANT_ID=<uuid>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<secure_password>
```

---

## Common Commands

### View Status:
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f
```

### Restart Service:
```bash
docker compose -f docker-compose.production.yml restart <service-name>
```

### Rebuild Service:
```bash
docker compose -f docker-compose.production.yml build --no-cache <service-name>
docker compose -f docker-compose.production.yml up -d <service-name>
```

### Stop All:
```bash
docker compose -f docker-compose.production.yml down
```

### Clean Up:
```bash
docker compose -f docker-compose.production.yml down -v  # Remove volumes too
docker system prune -a  # Clean unused images
```

---

## Troubleshooting

### Check logs:
```bash
docker logs <container-name> --tail 100
```

### Check resource usage:
```bash
docker stats --no-stream
```

### Check permissions:
```bash
ls -la ./data/postgres/
ls -la ./data/redis/
```

### Recreate container:
```bash
docker compose -f docker-compose.production.yml stop <service>
docker compose -f docker-compose.production.yml rm -f <service>
docker compose -f docker-compose.production.yml up -d <service>
```

---

## Documentation

Complete guides available in `/docs/`:
- `PRODUCTION_READY_DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_QUICK_REFERENCE.md` - Quick commands
- `KNOWN_ISSUES_AND_FIXES.md` - Troubleshooting
- `deployment-permissions-guide.md` - Permission setup
- `PRODUCTION_RESOURCE_OPTIMIZATION.md` - Resource tuning

---

## Support

For issues, see:
1. Check container logs
2. Review `docs/KNOWN_ISSUES_AND_FIXES.md`
3. Verify permissions on data directories
4. Check environment variables

**All services are production-ready and tested!** ✅
