# Database Setup Guide for RAG Assistant

This guide explains how the database is automatically set up when you run the deployment script.

## 🗄️ **Database Initialization Process**

When you run `./deploy_no_nginx.sh start`, the following happens automatically:

### **1. Database Tables Creation**
The script runs `npm run init:db` which creates all necessary tables:

- **tenants** - Organization/tenant information
- **users** - User accounts and authentication
- **categories** - Document categorization
- **contexts** - Document content and embeddings
- **intents** - User intent definitions
- **prompts** - AI prompt templates
- **ai_pricing** - AI model pricing information
- **chat_sessions** - Chat conversation sessions
- **chat_messages** - Individual chat messages

### **2. Default Data Insertion**
After tables are created, the script inserts default data:

- **Default Tenant** - Basic organization setup
- **Admin User** - System administrator account
- **AI Pricing** - Current AI model pricing from major providers

## 🚀 **Manual Database Setup**

If you need to run database setup manually:

```bash
# Navigate to docker directory
cd /path/to/rag-backend/infra/docker

# Setup database only
./deploy_no_nginx.sh db-setup

# Or run individual commands
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run init:db
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run ensure:tenant
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run ensure:admin-user
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run seed:ai-pricing
```

## 🔧 **Database Scripts**

### **initDatabase.ts**
- Creates all database tables
- Sets up proper indexes for performance
- Handles PostgreSQL extensions (pgvector for embeddings)

### **ensureTenant.ts**
- Creates default tenant if it doesn't exist
- Uses environment variables: `TENANT_ID`, `TENANT_NAME`, etc.

### **ensureAdminUser.ts**
- Creates admin user account
- Uses environment variables: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.

### **seedAiPricing.ts**
- Inserts current AI model pricing
- Includes OpenAI, Anthropic, and Google models
- Pricing data is current as of script creation

## 📊 **Default Data**

### **Default Tenant**
- **ID**: From `TENANT_ID` environment variable
- **Name**: From `TENANT_NAME` environment variable
- **Code**: `DEFAULT`
- **Slug**: `default`

### **Default Admin User**
- **Email**: From `ADMIN_EMAIL` environment variable
- **Password**: From `ADMIN_PASSWORD` environment variable
- **Role**: `admin`
- **Tenant**: Associated with default tenant

### **AI Pricing Models**
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash

## 🛠️ **Troubleshooting**

### **Tables Not Created**
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.prod_no_nginx.yml ps postgres

# Check PostgreSQL logs
docker-compose -f docker-compose.prod_no_nginx.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres psql -U rag_user -d rag_assistant -c "SELECT version();"
```

### **Default Data Not Inserted**
```bash
# Check if scripts exist
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend ls -la apps/backend/dist/scripts/

# Check script logs
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run init:db
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend npm run ensure:tenant
```

### **Permission Issues**
```bash
# Check file permissions
chmod +x deploy_no_nginx.sh

# Check container user
docker-compose -f docker-compose.prod_no_nginx.yml exec rag-backend whoami
```

## 🔍 **Verification Commands**

```bash
# Check if tables exist
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres psql -U rag_user -d rag_assistant -c "\dt"

# Check tenant data
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres psql -U rag_user -d rag_assistant -c "SELECT * FROM tenants;"

# Check admin user
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres psql -U rag_user -d rag_assistant -c "SELECT email, role FROM users WHERE role = 'admin';"

# Check AI pricing
docker-compose -f docker-compose.prod_no_nginx.yml exec postgres psql -U rag_user -d rag_assistant -c "SELECT model, provider FROM ai_pricing LIMIT 5;"
```

## 📝 **Environment Variables Required**

Make sure these are set in your `.env` file:

```bash
# Database
POSTGRES_DB=rag_assistant
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=your_secure_password

# Tenant
TENANT_ID=your-tenant-id
TENANT_NAME=Your Organization Name
TENANT_CODE=DEFAULT
TENANT_SLUG=default

# Admin User
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_password
ADMIN_NAME=System Administrator
```

## 🎯 **Next Steps**

After successful database setup:

1. **Verify tables exist**: Run verification commands above
2. **Test login**: Try logging in with admin credentials
3. **Check AI pricing**: Verify pricing data is loaded
4. **Monitor logs**: Watch for any errors in application logs

**Your database should now be fully initialized with all necessary tables and default data!** 🎉
