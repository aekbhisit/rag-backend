#!/bin/bash
# install_docker_nginx.sh
# Install Docker and Nginx on Ubuntu server with security hardening

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_header "Docker and Nginx Installation Script"
print_status "Starting installation on $(hostname)"

# 1. Update system
print_header "Updating System"
print_status "Updating package lists and upgrading system..."
apt update && apt upgrade -y
print_status "System updated successfully"

# 2. Install prerequisites
print_header "Installing Prerequisites"
print_status "Installing required packages..."
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release software-properties-common
print_status "Prerequisites installed"

# 3. Install Docker
print_header "Installing Docker"
print_status "Adding Docker's official GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

print_status "Adding Docker repository..."
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

print_status "Updating package index..."
apt update

print_status "Installing Docker Engine..."
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

print_status "Docker installed successfully"

# 4. Configure Docker
print_header "Configuring Docker"
print_status "Starting Docker service..."
systemctl start docker
systemctl enable docker

print_status "Adding current user to docker group..."
usermod -aG docker $SUDO_USER

# Create Docker daemon configuration for security
print_status "Configuring Docker daemon for security..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "seccomp-profile": "/etc/docker/seccomp-profile.json",
  "apparmor-profile": "docker-default"
}
EOF

# Create seccomp profile for additional security
print_status "Creating seccomp security profile..."
cat > /etc/docker/seccomp-profile.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_X32"
  ],
  "syscalls": [
    {
      "names": [
        "accept",
        "accept4",
        "access",
        "alarm",
        "bind",
        "brk",
        "capget",
        "capset",
        "chdir",
        "chmod",
        "chown",
        "chroot",
        "clock_getres",
        "clock_gettime",
        "clock_nanosleep",
        "close",
        "connect",
        "copy_file_range",
        "creat",
        "dup",
        "dup2",
        "dup3",
        "epoll_create",
        "epoll_create1",
        "epoll_ctl",
        "epoll_pwait",
        "epoll_wait",
        "eventfd",
        "eventfd2",
        "execve",
        "execveat",
        "exit",
        "exit_group",
        "faccessat",
        "fadvise64",
        "fallocate",
        "fanotify_mark",
        "fchdir",
        "fchmod",
        "fchmodat",
        "fchown",
        "fchownat",
        "fcntl",
        "fdatasync",
        "fgetxattr",
        "flistxattr",
        "flock",
        "fork",
        "fremovexattr",
        "fsetxattr",
        "fstat",
        "fstatfs",
        "fsync",
        "ftruncate",
        "futex",
        "getcwd",
        "getdents",
        "getdents64",
        "getegid",
        "geteuid",
        "getgid",
        "getgroups",
        "getpeername",
        "getpgid",
        "getpgrp",
        "getpid",
        "getppid",
        "getpriority",
        "getrandom",
        "getresgid",
        "getresuid",
        "getrlimit",
        "get_robust_list",
        "getrusage",
        "getsid",
        "getsockname",
        "getsockopt",
        "get_thread_area",
        "gettid",
        "gettimeofday",
        "getuid",
        "getxattr",
        "inotify_add_watch",
        "inotify_init",
        "inotify_init1",
        "inotify_rm_watch",
        "io_cancel",
        "ioctl",
        "io_destroy",
        "io_getevents",
        "ioprio_get",
        "ioprio_set",
        "io_setup",
        "io_submit",
        "ipc",
        "kill",
        "lchown",
        "lgetxattr",
        "link",
        "linkat",
        "listen",
        "listxattr",
        "llistxattr",
        "lremovexattr",
        "lseek",
        "lsetxattr",
        "lstat",
        "madvise",
        "memfd_create",
        "mincore",
        "mkdir",
        "mkdirat",
        "mknod",
        "mknodat",
        "mlock",
        "mlockall",
        "mmap",
        "mmap2",
        "mprotect",
        "mq_getsetattr",
        "mq_notify",
        "mq_open",
        "mq_timedreceive",
        "mq_timedsend",
        "mq_unlink",
        "mremap",
        "msgctl",
        "msgget",
        "msgrcv",
        "msgsnd",
        "msync",
        "munlock",
        "munlockall",
        "munmap",
        "nanosleep",
        "newfstatat",
        "_newselect",
        "open",
        "openat",
        "pause",
        "pipe",
        "pipe2",
        "poll",
        "ppoll",
        "prctl",
        "pread64",
        "preadv",
        "prlimit64",
        "pselect6",
        "ptrace",
        "pwrite64",
        "pwritev",
        "read",
        "readahead",
        "readlink",
        "readlinkat",
        "readv",
        "recv",
        "recvfrom",
        "recvmmsg",
        "recvmsg",
        "remap_file_pages",
        "removexattr",
        "rename",
        "renameat",
        "renameat2",
        "restart_syscall",
        "rmdir",
        "rt_sigaction",
        "rt_sigpending",
        "rt_sigprocmask",
        "rt_sigqueueinfo",
        "rt_sigreturn",
        "rt_sigsuspend",
        "rt_sigtimedwait",
        "rt_tgsigqueueinfo",
        "sched_get_priority_max",
        "sched_get_priority_min",
        "sched_getaffinity",
        "sched_getparam",
        "sched_getscheduler",
        "sched_rr_get_interval",
        "sched_setaffinity",
        "sched_setparam",
        "sched_setscheduler",
        "sched_yield",
        "seccomp",
        "select",
        "send",
        "sendfile",
        "sendmmsg",
        "sendmsg",
        "sendto",
        "setfsgid",
        "setfsuid",
        "setgid",
        "setgroups",
        "setitimer",
        "setpgid",
        "setpriority",
        "setregid",
        "setresgid",
        "setresuid",
        "setreuid",
        "setrlimit",
        "set_robust_list",
        "setsid",
        "setsockopt",
        "set_thread_area",
        "set_tid_address",
        "setuid",
        "setxattr",
        "shmat",
        "shmctl",
        "shmdt",
        "shmget",
        "shutdown",
        "sigaltstack",
        "signalfd",
        "signalfd4",
        "sigreturn",
        "socket",
        "socketcall",
        "socketpair",
        "splice",
        "stat",
        "statfs",
        "symlink",
        "symlinkat",
        "sync",
        "sync_file_range",
        "syncfs",
        "sysinfo",
        "syslog",
        "tee",
        "tgkill",
        "time",
        "timer_create",
        "timer_delete",
        "timer_getoverrun",
        "timer_gettime",
        "timer_settime",
        "timerfd_create",
        "timerfd_gettime",
        "timerfd_settime",
        "times",
        "tkill",
        "truncate",
        "umask",
        "uname",
        "unlink",
        "unlinkat",
        "utime",
        "utimensat",
        "utimes",
        "vfork",
        "vmsplice",
        "wait4",
        "waitid",
        "waitpid",
        "write",
        "writev"
      ],
      "action": "SCMP_ACT_ALLOW",
      "args": [],
      "comment": "",
      "includes": {},
      "excludes": {}
    }
  ]
}
EOF

print_status "Restarting Docker with security configuration..."
systemctl restart docker

# 5. Install Nginx
print_header "Installing Nginx"
print_status "Installing Nginx web server..."
apt install -y nginx

print_status "Starting and enabling Nginx..."
systemctl start nginx
systemctl enable nginx

# 6. Configure Nginx Security
print_header "Configuring Nginx Security"
print_status "Creating secure Nginx configuration..."

# Backup original config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create secure Nginx configuration
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

print_status "Nginx security configuration created"

# 7. Configure Firewall
print_header "Configuring Firewall"
print_status "Configuring UFW firewall..."

# Reset UFW to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 'Nginx Full'

# Enable firewall
ufw --force enable

print_status "Firewall configured successfully"

# 8. Install Docker Compose
print_header "Installing Docker Compose"
print_status "Installing Docker Compose..."

# Install docker-compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create symlink
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

print_status "Docker Compose installed successfully"

# 9. Create useful scripts
print_header "Creating Management Scripts"
print_status "Creating Docker and Nginx management scripts..."

# Docker management script
cat > /usr/local/bin/docker-manage.sh << 'EOF'
#!/bin/bash
# Docker management script

case "$1" in
    start)
        echo "Starting Docker..."
        systemctl start docker
        ;;
    stop)
        echo "Stopping Docker..."
        systemctl stop docker
        ;;
    restart)
        echo "Restarting Docker..."
        systemctl restart docker
        ;;
    status)
        systemctl status docker
        ;;
    logs)
        journalctl -u docker -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/docker-manage.sh

# Nginx management script
cat > /usr/local/bin/nginx-manage.sh << 'EOF'
#!/bin/bash
# Nginx management script

case "$1" in
    start)
        echo "Starting Nginx..."
        systemctl start nginx
        ;;
    stop)
        echo "Stopping Nginx..."
        systemctl stop nginx
        ;;
    restart)
        echo "Restarting Nginx..."
        systemctl restart nginx
        ;;
    reload)
        echo "Reloading Nginx configuration..."
        nginx -t && systemctl reload nginx
        ;;
    status)
        systemctl status nginx
        ;;
    test)
        nginx -t
        ;;
    logs)
        tail -f /var/log/nginx/error.log
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reload|status|test|logs}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/nginx-manage.sh

# 10. Verify installations
print_header "Verifying Installations"
print_status "Checking Docker installation..."
docker --version
docker-compose --version

print_status "Checking Nginx installation..."
nginx -v
systemctl is-active nginx

print_status "Checking firewall status..."
ufw status

# 11. Display final status
print_header "Installation Complete!"
print_status "Docker and Nginx have been successfully installed and configured"
echo ""
echo "🐳 DOCKER STATUS:"
echo "=================="
echo "Version: $(docker --version)"
echo "Compose: $(docker-compose --version)"
echo "Status: $(systemctl is-active docker)"
echo ""
echo "🌐 NGINX STATUS:"
echo "================"
echo "Version: $(nginx -v 2>&1)"
echo "Status: $(systemctl is-active nginx)"
echo ""
echo "🔥 FIREWALL STATUS:"
echo "==================="
ufw status
echo ""
echo "📋 MANAGEMENT COMMANDS:"
echo "======================="
echo "Docker: /usr/local/bin/docker-manage.sh {start|stop|restart|status|logs}"
echo "Nginx:  /usr/local/bin/nginx-manage.sh {start|stop|restart|reload|status|test|logs}"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "==================="
echo "1. Docker is configured with security hardening"
echo "2. Nginx has security headers enabled"
echo "3. Firewall is configured to allow only necessary ports"
echo "4. You may need to log out and back in for Docker group changes to take effect"
echo ""
print_status "Installation completed successfully!"
