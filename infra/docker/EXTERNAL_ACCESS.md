# External Access Guide for RAG Assistant

This guide shows how to connect to PostgreSQL, Redis, and MinIO from outside the Docker containers.

## 🌐 **External Connection Details**

### **PostgreSQL Database**
- **Host**: `rag.haahii.com` (or your server IP)
- **Port**: `5432`
- **Database**: `rag_assistant`
- **Username**: `rag_user`
- **Password**: Value of `POSTGRES_PASSWORD` in your `.env` file

### **Redis Cache**
- **Host**: `rag.haahii.com` (or your server IP)
- **Port**: `6379`
- **Password**: Value of `REDIS_PASSWORD` in your `.env` file

### **MinIO Object Storage**
- **API Endpoint**: `rag.haahii.com:9000`
- **Console URL**: `http://rag.haahii.com:9001`
- **Username**: Value of `MINIO_ROOT_USER` in your `.env` file
- **Password**: Value of `MINIO_ROOT_PASSWORD` in your `.env` file

## 🔧 **Connection Examples**

### **PostgreSQL - Using psql**
```bash
# Connect from another server
psql -h rag.haahii.com -p 5432 -U rag_user -d rag_assistant

# Connect from local machine
psql -h rag.haahii.com -p 5432 -U rag_user -d rag_assistant
```

### **PostgreSQL - Using pgAdmin**
1. Open pgAdmin
2. Add new server
3. **General tab**:
   - Name: `RAG Assistant`
4. **Connection tab**:
   - Host: `rag.haahii.com`
   - Port: `5432`
   - Database: `rag_assistant`
   - Username: `rag_user`
   - Password: Your password

### **Redis - Using redis-cli**
```bash
# Connect from another server
redis-cli -h rag.haahii.com -p 6379 -a your_redis_password

# Connect from local machine
redis-cli -h rag.haahii.com -p 6379 -a your_redis_password
```

### **Redis - Using RedisInsight**
1. Open RedisInsight
2. Add new database
3. **Connection details**:
   - Host: `rag.haahii.com`
   - Port: `6379`
   - Username: (leave empty)
   - Password: Your Redis password

### **MinIO - Using MinIO Client (mc)**
```bash
# Configure MinIO client
mc alias set rag-assistant http://rag.haahii.com:9000 minioadmin your_minio_password

# List buckets
mc ls rag-assistant

# Upload file
mc cp file.txt rag-assistant/rag-storage/
```

### **MinIO - Web Console**
1. Open browser: `http://rag.haahii.com:9001`
2. Login with MinIO credentials from your `.env` file

## 🛡️ **Security Considerations**

### **Firewall Rules**
Make sure these ports are open on your server:
```bash
# PostgreSQL
sudo ufw allow 5432/tcp

# Redis
sudo ufw allow 6379/tcp

# MinIO
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp

# Reload firewall
sudo ufw reload
```

### **Network Security**
- **PostgreSQL**: Consider restricting access to specific IP ranges
- **Redis**: Redis doesn't have built-in user management, rely on password
- **MinIO**: Access control through MinIO's built-in user management

### **SSL/TLS (Recommended for Production)**
```bash
# PostgreSQL SSL
# Add to postgres service in docker-compose:
environment:
  POSTGRES_SSL_MODE: require
  POSTGRES_SSL_CERT: /etc/ssl/certs/ssl-cert-snakeoil.pem
  POSTGRES_SSL_KEY: /etc/ssl/private/ssl-cert-snakeoil.key

# Redis SSL (requires Redis 6+)
# Add to redis service:
command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} --tls-port 6380 --port 0
ports:
  - "6380:6380"  # SSL port
```

## 📊 **Monitoring & Management Tools**

### **PostgreSQL Monitoring**
- **pgAdmin**: Web-based administration
- **pgAdmin4**: Desktop application
- **DBeaver**: Universal database tool
- **DataGrip**: JetBrains database IDE

### **Redis Monitoring**
- **RedisInsight**: Official Redis GUI
- **Redis Commander**: Web-based Redis manager
- **Redis Desktop Manager**: Desktop application

### **MinIO Management**
- **MinIO Console**: Built-in web interface
- **MinIO Client (mc)**: Command-line tool
- **S3 Browser**: Generic S3-compatible client

## 🔍 **Troubleshooting**

### **Connection Refused**
```bash
# Check if ports are open
sudo netstat -tlnp | grep -E ':(5432|6379|9000|9001)'

# Check firewall status
sudo ufw status

# Test local connections
telnet localhost 5432
telnet localhost 6379
```

### **Authentication Failed**
```bash
# Check environment variables
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres env | grep POSTGRES
docker-compose -f docker-compose.prod_no_nginx.yml exec redis env | grep REDIS
docker-compose -f docker-compose.prod_no_nginx.yml exec minio env | grep MINIO
```

### **Network Issues**
```bash
# Test DNS resolution
nslookup rag.haahii.com

# Test port accessibility from external
telnet rag.haahii.com 5432
telnet rag.haahii.com 6379
telnet rag.haahii.com 9000
```

## 🚀 **Quick Connection Test**

```bash
# Test PostgreSQL
psql -h rag.haahii.com -p 5432 -U rag_user -d rag_assistant -c "SELECT version();"

# Test Redis
redis-cli -h rag.haahii.com -p 6379 -a your_password ping

# Test MinIO
curl -I http://rag.haahii.com:9001
```

## 📝 **Environment Variables Reference**

Make sure these are set in your `.env` file:
```bash
# Database
POSTGRES_DB=rag_assistant
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
```

**Your services are now accessible externally! Use these connection details with your preferred database tools.** 🎉
