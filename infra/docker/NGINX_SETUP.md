# External Nginx Setup for RAG Assistant

This guide helps you set up external Nginx to proxy traffic to your RAG Assistant containers.

## 🌐 **Prerequisites**

- Ubuntu/Debian server with Nginx installed
- Domain name pointing to your server
- SSL certificate (Let's Encrypt recommended)

## 📋 **Setup Steps**

### **1. Install Nginx (if not already installed)**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **2. Install SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace YOUR_DOMAIN.com)
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

### **3. Copy and Configure Site**

```bash
# Copy the site configuration
sudo cp /path/to/rag-backend/infra/docker/nginx/sites-available/rag-assistant /etc/nginx/sites-available/

# Edit the configuration with your domain
sudo nano /etc/nginx/sites-available/rag-assistant

# Replace all instances of "YOUR_DOMAIN.com" with your actual domain
sudo sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' /etc/nginx/sites-available/rag-assistant

# Enable the site
sudo ln -s /etc/nginx/sites-available/rag-assistant /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### **4. Update Environment Variables**

```bash
# Navigate to your RAG backend directory
cd /path/to/rag-backend/infra/docker

# Copy environment file
cp env.example .env

# Edit environment file
nano .env

# Update these values:
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_BACKEND_URL=https://yourdomain.com
DOMAIN=yourdomain.com
```

### **5. Test and Reload Nginx**

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

### **6. Start RAG Assistant Containers**

```bash
# Navigate to docker directory
cd /path/to/rag-backend/infra/docker

# Build and start containers
docker-compose -f docker-compose.prod_no_nginx.yml down
docker-compose -f docker-compose.prod_no_nginx.yml build --no-cache
docker-compose -f docker-compose.prod_no_nginx.yml up -d

# Check container status
docker-compose -f docker-compose.prod_no_nginx.yml ps
```

## 🔄 **Service Mapping**

The Nginx configuration maps requests as follows:

| URL Path | Destination | Purpose |
|----------|-------------|---------|
| `/` | `localhost:3000` | Admin Web UI (Next.js) |
| `/api/*` | `localhost:3001` | Backend API endpoints |
| `/rag/*` | `localhost:3001` | RAG/Search endpoints |
| `/health` | `localhost:3001` | Health check |
| `/_next/static/*` | `localhost:3000` | Next.js static files |
| `/minio-console/*` | `localhost:9001` | MinIO Console (optional) |

## 🛡️ **Security Features**

- **SSL/TLS encryption** with modern cipher suites
- **Rate limiting** on API and auth endpoints
- **Security headers** (HSTS, CSP, XSS protection)
- **CORS configuration** for API access
- **File upload limits** (100MB max)
- **Access controls** for sensitive files

## 🔧 **Troubleshooting**

### **Check Nginx Logs**
```bash
sudo tail -f /var/log/nginx/rag-assistant.error.log
sudo tail -f /var/log/nginx/rag-assistant.access.log
```

### **Check Container Logs**
```bash
docker-compose -f docker-compose.prod_no_nginx.yml logs rag-backend
docker-compose -f docker-compose.prod_no_nginx.yml logs admin-web
```

### **Test Backend Connection**
```bash
curl http://localhost:3001/health
curl http://localhost:3000
```

### **Test External Access**
```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
```

## 📊 **Performance Optimization**

### **Enable HTTP/2**
Already enabled in the configuration with `http2` directive.

### **Gzip Compression**
Already configured for text files, JSON, and JavaScript.

### **Caching**
Static files (`/_next/static/`) are cached for 1 year.

### **Connection Pooling**
Nginx maintains persistent connections to backend services.

## 🔒 **Additional Security (Optional)**

### **Fail2Ban Protection**
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create custom filter for RAG Assistant
sudo nano /etc/fail2ban/filter.d/rag-assistant.conf
```

```ini
[Definition]
failregex = ^<HOST> .* "(GET|POST|PUT|DELETE) .* HTTP/.*" (401|403|429) .*$
ignoreregex =
```

### **Firewall Configuration**
```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 🌐 **Access Your Application**

After setup is complete:

- **Admin Interface**: `https://yourdomain.com`
- **API Health Check**: `https://yourdomain.com/health`
- **MinIO Console**: `https://yourdomain.com/minio-console/` (if enabled)

## 📞 **Support**

If you encounter issues:
1. Check Nginx error logs
2. Verify container health: `docker-compose ps`
3. Test local connectivity: `curl localhost:3000` and `curl localhost:3001/health`
4. Ensure DNS is pointing to your server
5. Verify SSL certificate is valid: `sudo certbot certificates`
