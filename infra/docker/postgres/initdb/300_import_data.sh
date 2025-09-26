#!/bin/bash
# 300_import_data.sh
# Import the complete rag_assistant database dump
# This script handles the large SQL file import during PostgreSQL initialization

set -e

echo "Starting rag_assistant data import..."

# Check if the SQL file exists
if [ ! -f "/docker-entrypoint-initdb.d/rag_assistant.sql" ]; then
    echo "Warning: rag_assistant.sql not found, skipping data import"
    exit 0
fi

# Import the SQL file
echo "Importing rag_assistant.sql (this may take a few minutes)..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/rag_assistant.sql

echo "rag_assistant data import completed successfully!"
