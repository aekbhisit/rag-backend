# RAG Assistant Production Docker Setup

This directory contains the production-ready Docker configuration for the RAG Assistant application.

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your production values
nano .env

# Run initial setup
./deploy.sh setup
```

### 2. Start Production Stack

```bash
./deploy.sh start
```

### 3. Check Status

```bash
./deploy.sh status
```

## 📁 Directory Structure

```
infra/docker/
├── docker-compose.prod.yml    # Production compose file
├── Dockerfile                 # Main application Dockerfile
├── env.example               # Environment variables template
├── deploy.sh                 # Deployment management script
├── scripts/
│   ├── backup.sh            # Automated backup script
│   └── manual-backup.sh     # Manual backup script
├── nginx/
│   ├── nginx.conf          # Main Nginx configuration
│   └── conf.d/
│       └── default.conf    # Server configuration
├── postgres/                # PostgreSQL configuration
└── data/                    # Persistent data (created automatically)
    ├── postgres/           # Database data
    ├── redis/              # Redis data
    ├── minio/              # Object storage data
    ├── logs/               # Application logs
    ├── uploads/            # File uploads
    ├── temp/               # Temporary files
    ├── backups/            # Backup files
    └── ssl/                # SSL certificates
```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

- **Database**: PostgreSQL credentials and settings
- **Redis**: Cache password
- **MinIO**: Object storage credentials
- **JWT**: Secret key for authentication
- **AI Providers**: API keys for OpenAI, Anthropic, Google
- **Backup**: Retention period and settings

### SSL Certificates

For production, replace the self-signed certificates in `data/ssl/` with your actual SSL certificates.

## 🗄️ Backup System

### Automated Backups

The system runs daily backups at 2:00 AM using cron:

- Database backups (PostgreSQL)
- Volume backups (application data)
- Automatic cleanup based on retention policy

### Manual Backups

```bash
# Full backup (database + volumes)
./deploy.sh backup

# Database only
./scripts/manual-backup.sh db

# Volumes only
./scripts/manual-backup.sh volumes

# Custom retention period
./scripts/manual-backup.sh full 30
```

### Restore from Backup

```bash
# List available backups
./scripts/manual-backup.sh restore

# Follow the restore instructions displayed
```

## 📊 Monitoring & Logs

### Service Status

```bash
./deploy.sh status
```

### View Logs

```bash
# All services
./deploy.sh logs

# Specific service
./deploy.sh logs nginx
./deploy.sh logs rag-backend
./deploy.sh logs postgres
```

### Health Checks

- **Application**: `/health` endpoint
- **Database**: PostgreSQL connection check
- **Redis**: Connection and ping test
- **MinIO**: HTTP health check

## 🔄 Maintenance

### Update Stack

```bash
./deploy.sh update
```

### Restart Services

```bash
./deploy.sh restart
```

### Cleanup

```bash
# Clean old logs and temp files
./deploy.sh clean
```

## 🛡️ Security Features

- **Non-root containers**: All services run as non-root users
- **Network isolation**: Services communicate via internal network
- **Rate limiting**: API endpoints protected against abuse
- **Security headers**: XSS, CSRF, and other security headers
- **SSL/TLS**: HTTPS with modern cipher suites
- **Health checks**: Automatic service health monitoring

## 🌐 Network Configuration

- **Internal Network**: `172.20.0.0/16`
- **External Ports**: 80 (HTTP), 443 (HTTPS)
- **Service Ports**: 3000 (App), 5432 (DB), 6379 (Redis), 9000 (MinIO)

## 📈 Scaling Considerations

### Horizontal Scaling

To scale the application:

```yaml
# In docker-compose.prod.yml
rag-backend:
  deploy:
    replicas: 3
```

### Load Balancer

For production, consider using a load balancer (HAProxy, Traefik) in front of Nginx.

### Database Scaling

For high availability, consider:
- PostgreSQL read replicas
- Redis cluster
- MinIO distributed mode

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports 80, 443, 3000 are available
2. **Permission errors**: Ensure proper ownership of data directories
3. **SSL errors**: Verify SSL certificate paths and permissions
4. **Database connection**: Check PostgreSQL container health

### Debug Mode

```bash
# Run with debug output
docker-compose -f docker-compose.prod.yml up --verbose
```

### Reset Everything

```bash
# Stop and remove everything
./deploy.sh stop
docker system prune -a -f
rm -rf data/
./deploy.sh setup
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)
- [MinIO Docker](https://hub.docker.com/r/minio/minio)

## 🤝 Support

For issues and questions:
1. Check the logs: `./deploy.sh logs`
2. Verify configuration: `./deploy.sh status`
3. Check service health: `docker-compose -f docker-compose.prod.yml ps`
