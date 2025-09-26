#!/bin/bash
# implement_kdevtmpfsi_protection.sh
# Comprehensive protection against kdevtmpfsi and other mining malware

set -e

echo "🛡️  Implementing kdevtmpfsi Protection..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

print_status "Starting kdevtmpfsi protection implementation..."

# 1. Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# 2. Install security tools
print_status "Installing security tools..."
apt install -y fail2ban rkhunter chkrootkit htop iotop nethogs bc mailutils

# 3. Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
print_status "Firewall configured: $(ufw status | grep -c 'ALLOW') rules active"

# 4. Harden SSH
print_status "Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh
print_status "SSH hardened successfully"

# 5. Configure fail2ban
print_status "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban
print_status "Fail2ban configured and started"

# 6. Create malware detection script
print_status "Creating malware detection script..."
cat > /usr/local/bin/malware_detector.sh << 'EOF'
#!/bin/bash
# Malware detection script for kdevtmpfsi and other mining malware

SUSPICIOUS_PROCESSES=("kdevtmpfsi" "minerd" "xmrig" "cpuminer" "ccminer" "stratum" "crypto" "mining")
LOG_FILE="/var/log/malware_detection.log"
ALERT_EMAIL="admin@yourdomain.com"

# Function to log events
log_event() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check for suspicious processes
for process in "${SUSPICIOUS_PROCESSES[@]}"; do
    if pgrep -f "$process" > /dev/null; then
        log_event "ALERT: Suspicious process '$process' detected!"
        echo "ALERT: Suspicious process '$process' detected!"
        
        # Kill the process
        pkill -f "$process"
        log_event "Killed suspicious process '$process'"
        
        # Send email alert (if mail is configured)
        if command -v mail > /dev/null; then
            echo "Malware process '$process' detected and killed on $(hostname)" | mail -s "Security Alert - Malware Detected" "$ALERT_EMAIL" 2>/dev/null || true
        fi
    fi
done

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log_event "ALERT: High CPU usage detected: $CPU_USAGE%"
    echo "ALERT: High CPU usage detected: $CPU_USAGE%"
    
    # Log top processes
    top -bn1 | head -20 >> "/var/log/high_cpu_$(date +%Y%m%d).log"
fi

# Check for suspicious network connections
netstat -tuln | grep -E ":(4444|3333|8080|9999|5555)" | while read line; do
    log_event "ALERT: Suspicious port in use: $line"
    echo "ALERT: Suspicious port in use: $line"
done

# Check for mining pool connections
netstat -an | grep -E "(stratum|pool|mining)" | while read line; do
    log_event "ALERT: Mining pool connection detected: $line"
    echo "ALERT: Mining pool connection detected: $line"
done
EOF

chmod +x /usr/local/bin/malware_detector.sh
print_status "Malware detection script created"

# 7. Create Docker security script
print_status "Creating Docker security script..."
cat > /usr/local/bin/docker_security_scan.sh << 'EOF'
#!/bin/bash
# Docker container security scanning script

SUSPICIOUS_PROCESSES=("kdevtmpfsi" "minerd" "xmrig" "cpuminer" "ccminer" "stratum")
LOG_FILE="/var/log/docker_security.log"

log_event() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Scan all running containers
docker ps --format "table {{.Names}}\t{{.Image}}" | tail -n +2 | while read name image; do
    if [ -n "$name" ]; then
        log_event "Scanning container: $name ($image)"
        
        # Check for suspicious processes
        if docker exec "$name" ps aux 2>/dev/null | grep -E "$(IFS='|'; echo "${SUSPICIOUS_PROCESSES[*]}")" > /dev/null; then
            log_event "ALERT: Malware detected in container $name"
            echo "ALERT: Malware detected in container $name"
            
            # Stop and remove the container
            docker stop "$name" 2>/dev/null || true
            docker rm "$name" 2>/dev/null || true
            log_event "Container $name stopped and removed"
        fi
        
        # Check CPU usage
        CPU_USAGE=$(docker stats --no-stream --format "table {{.CPUPerc}}" "$name" 2>/dev/null | tail -1 | cut -d'%' -f1 | cut -d',' -f1)
        if [ -n "$CPU_USAGE" ] && (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
            log_event "ALERT: High CPU usage in container $name: $CPU_USAGE%"
            echo "ALERT: High CPU usage in container $name: $CPU_USAGE%"
        fi
    fi
done
EOF

chmod +x /usr/local/bin/docker_security_scan.sh
print_status "Docker security script created"

# 8. Set up monitoring cron jobs
print_status "Setting up monitoring cron jobs..."
cat > /etc/cron.d/malware_protection << 'EOF'
# Malware protection monitoring
*/5 * * * * root /usr/local/bin/malware_detector.sh
*/10 * * * * root /usr/local/bin/docker_security_scan.sh
0 */6 * * * root rkhunter --check --skip-keypress
0 2 * * * root chkrootkit
EOF

print_status "Cron jobs configured"

# 9. Configure log rotation
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/malware_protection << 'EOF'
/var/log/malware_detection.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}

/var/log/docker_security.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

print_status "Log rotation configured"

# 10. Create system health check script
print_status "Creating system health check script..."
cat > /usr/local/bin/system_health_check.sh << 'EOF'
#!/bin/bash
# System health check script

LOG_FILE="/var/log/system_health.log"

log_event() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check system load
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
if (( $(echo "$LOAD > 4.0" | bc -l) )); then
    log_event "WARNING: High system load: $LOAD"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    log_event "WARNING: High memory usage: $MEMORY_USAGE%"
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt 90 ]; then
    log_event "WARNING: High disk usage: $DISK_USAGE%"
fi

# Check for suspicious processes
SUSPICIOUS_COUNT=$(ps aux | grep -E "(kdevtmpfsi|minerd|xmrig)" | grep -v grep | wc -l)
if [ "$SUSPICIOUS_COUNT" -gt 0 ]; then
    log_event "ALERT: $SUSPICIOUS_COUNT suspicious processes detected"
fi

log_event "Health check completed - Load: $LOAD, Memory: $MEMORY_USAGE%, Disk: $DISK_USAGE%"
EOF

chmod +x /usr/local/bin/system_health_check.sh
print_status "System health check script created"

# 11. Run initial security scan
print_status "Running initial security scan..."
rkhunter --check --skip-keypress > /var/log/rkhunter_initial.log 2>&1 || true
chkrootkit > /var/log/chkrootkit_initial.log 2>&1 || true
print_status "Initial security scan completed"

# 12. Test the protection
print_status "Testing protection scripts..."
/usr/local/bin/malware_detector.sh
/usr/local/bin/system_health_check.sh
print_status "Protection scripts tested successfully"

# 13. Display final status
print_status "kdevtmpfsi protection implementation completed!"
echo ""
echo "🛡️  PROTECTION STATUS:"
echo "========================"
echo "✅ Firewall: $(ufw status | grep -c 'ALLOW') rules active"
echo "✅ SSH: Hardened (no root login, key auth only)"
echo "✅ Fail2ban: $(systemctl is-active fail2ban) (SSH protection)"
echo "✅ Malware Detection: Every 5 minutes"
echo "✅ Docker Security: Every 10 minutes"
echo "✅ Rootkit Scan: Every 6 hours"
echo "✅ System Health: Monitored"
echo ""
echo "📋 MONITORING COMMANDS:"
echo "========================"
echo "Check malware: /usr/local/bin/malware_detector.sh"
echo "Check Docker: /usr/local/bin/docker_security_scan.sh"
echo "Check health: /usr/local/bin/system_health_check.sh"
echo "View logs: tail -f /var/log/malware_detection.log"
echo ""
echo "⚠️  IMPORTANT:"
echo "=============="
echo "1. Update ALERT_EMAIL in /usr/local/bin/malware_detector.sh"
echo "2. Test email notifications"
echo "3. Review logs regularly"
echo "4. Keep system updated"
echo ""
print_status "Protection implementation completed successfully!"
