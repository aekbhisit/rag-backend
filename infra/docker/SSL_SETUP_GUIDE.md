# SSL Certificate Setup Guide for RAG Assistant

This guide walks you through setting up SSL certificates for your RAG Assistant domain **rag.haahii.com**.

## 🚀 **Phase 1: Get Site Running with HTTP First**

### **Step 1: Setup HTTP-Only Configuration**

```bash
# Copy the HTTP-only configuration
sudo cp /path/to/rag-backend/infra/docker/nginx/sites-available/rag-assistant-http-only.conf /etc/nginx/sites-available/rag-assistant

# Enable the site
sudo ln -s /etc/nginx/sites-available/rag-assistant /etc/nginx/sites-enabled/

# Remove default site (if exists)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### **Step 2: Setup Environment for HTTP**

```bash
# Navigate to docker directory
cd /path/to/rag-backend/infra/docker

# Copy HTTP environment
cp env.http .env

# Edit if needed
nano .env
```

### **Step 3: Start Your Containers**

```bash
# Start containers with HTTP configuration
docker-compose -f docker-compose.prod_no_nginx.yml down
docker-compose -f docker-compose.prod_no_nginx.yml up -d

# Check status
docker-compose -f docker-compose.prod_no_nginx.yml ps
```

### **Step 4: Test HTTP Access**

```bash
# Test local containers
curl http://localhost:3000
curl http://localhost:3001/health

# Test external access (should work if DNS is set)
curl http://rag.haahii.com/health
```

## 🔒 **Phase 2: Generate SSL Certificates**

### **Step 1: Install Certbot**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### **Step 2: Create Webroot Directory**

```bash
# Create directory for ACME challenges
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html
```

### **Step 3: Generate Certificate (Webroot Method)**

```bash
# Generate certificate using webroot method
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d rag.haahii.com \
  -d www.rag.haahii.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Check if certificates were created
sudo ls -la /etc/letsencrypt/live/rag.haahii.com/
```

**Expected output:**
```
cert.pem -> ../../archive/rag.haahii.com/cert1.pem
chain.pem -> ../../archive/rag.haahii.com/chain1.pem
fullchain.pem -> ../../archive/rag.haahii.com/fullchain1.pem
privkey.pem -> ../../archive/rag.haahii.com/privkey1.pem
```

### **Step 4: Alternative - Standalone Method (if webroot fails)**

```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Generate certificate using standalone method
sudo certbot certonly --standalone \
  -d rag.haahii.com \
  -d www.rag.haahii.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Start Nginx again
sudo systemctl start nginx
```

## 🔄 **Phase 3: Switch to HTTPS Configuration**

### **Step 1: Update Nginx Configuration**

```bash
# Replace with HTTPS configuration
sudo cp /path/to/rag-backend/infra/docker/nginx/sites-available/rag-assistant-simple.conf /etc/nginx/sites-available/rag-assistant

# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

### **Step 2: Update Environment for HTTPS**

```bash
# Update environment file
nano .env

# Change these lines:
# NEXT_PUBLIC_API_URL=https://rag.haahii.com/api
# NEXT_PUBLIC_BACKEND_URL=https://rag.haahii.com
```

### **Step 3: Restart Containers with HTTPS Config**

```bash
# Rebuild admin-web with new environment
docker-compose -f docker-compose.prod_no_nginx.yml down
docker-compose -f docker-compose.prod_no_nginx.yml build admin-web
docker-compose -f docker-compose.prod_no_nginx.yml up -d

# Check status
docker-compose -f docker-compose.prod_no_nginx.yml ps
```

### **Step 4: Test HTTPS Access**

```bash
# Test HTTPS access
curl https://rag.haahii.com/health
curl https://rag.haahii.com/api/health

# Test certificate
openssl s_client -connect rag.haahii.com:443 -servername rag.haahii.com
```

## 🔄 **Phase 4: Setup Certificate Auto-Renewal**

### **Step 1: Test Renewal**

```bash
# Test certificate renewal (dry run)
sudo certbot renew --dry-run
```

### **Step 2: Setup Cron Job**

```bash
# Edit crontab
sudo crontab -e

# Add this line to renew certificates twice daily
0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx
```

## 🛠️ **Troubleshooting**

### **Certificate Generation Issues**

**Problem: DNS not pointing to server**
```bash
# Check DNS resolution
nslookup rag.haahii.com
dig rag.haahii.com

# Should return your server's IP address
```

**Problem: Port 80 blocked**
```bash
# Check if port 80 is accessible
sudo netstat -tlnp | grep :80
sudo ufw status

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443
```

**Problem: Webroot not accessible**
```bash
# Check webroot permissions
sudo ls -la /var/www/html
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### **HTTPS Redirect Issues**

**Problem: Mixed content warnings**
- Ensure all API calls use HTTPS URLs
- Check `NEXT_PUBLIC_API_URL` in environment
- Clear browser cache

**Problem: Certificate not trusted**
```bash
# Check certificate chain
openssl s_client -connect rag.haahii.com:443 -showcerts

# Verify certificate files
sudo certbot certificates
```

## 📋 **Quick Commands Reference**

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/rag-assistant.error.log

# Check container status
docker-compose -f docker-compose.prod_no_nginx.yml ps

# View container logs
docker-compose -f docker-compose.prod_no_nginx.yml logs admin-web
docker-compose -f docker-compose.prod_no_nginx.yml logs rag-backend
```

## ✅ **Final Verification**

After completing all steps, verify:

1. **HTTP redirects to HTTPS**: `curl -I http://rag.haahii.com`
2. **HTTPS works**: `curl https://rag.haahii.com/health`
3. **Admin interface loads**: Visit `https://rag.haahii.com` in browser
4. **API accessible**: `curl https://rag.haahii.com/api/health`
5. **Certificate auto-renewal**: `sudo certbot renew --dry-run`

Your RAG Assistant should now be fully secured with SSL! 🎉
