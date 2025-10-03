#!/bin/bash

# SQL Import Script for RAG Assistant
# This script imports the rag_assistant.sql file into the PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting SQL Import Process...${NC}"

# Check if required environment variables are set
if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${RED}❌ Error: Required environment variables not set${NC}"
    echo "Please set: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
    exit 1
fi

# Check if SQL file exists
SQL_FILE="/import/rag_assistant.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: SQL file not found at $SQL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 SQL file found: $SQL_FILE${NC}"
echo -e "${YELLOW}📊 File size: $(du -h $SQL_FILE | cut -f1)${NC}"

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"

# Check if database already has data
echo -e "${YELLOW}🔍 Checking if database already has data...${NC}"
TABLE_COUNT=$(psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Database already contains $TABLE_COUNT tables${NC}"
    echo -e "${YELLOW}   Skipping import to avoid data conflicts${NC}"
    echo -e "${GREEN}✅ Import process completed (skipped)${NC}"
    exit 0
fi

# Import the SQL file
echo -e "${YELLOW}📥 Importing SQL file...${NC}"
if psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SQL_FILE"; then
    echo -e "${GREEN}✅ SQL import completed successfully!${NC}"
    
    # Verify import
    echo -e "${YELLOW}🔍 Verifying import...${NC}"
    NEW_TABLE_COUNT=$(psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ Database now contains $NEW_TABLE_COUNT tables${NC}"
    
    # Show some sample data
    echo -e "${YELLOW}📋 Sample data verification:${NC}"
    psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 10;" 2>/dev/null || true
    
else
    echo -e "${RED}❌ SQL import failed!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 SQL Import Process Completed Successfully!${NC}"