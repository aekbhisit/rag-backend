// Environment setup for travel-ai-bot
// This file ensures environment variables are properly loaded

// Load environment variables
if (typeof window === 'undefined') {
  // Server-side environment setup
  require('dotenv').config();
}

// Export environment configuration
export const envConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  TENANT_ID: process.env.TENANT_ID || '',
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  RAG_BASE_URL: process.env.RAG_BASE_URL || 'http://localhost:3001',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1',
};

// Log environment setup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Environment setup completed:', {
    NODE_ENV: envConfig.NODE_ENV,
    TENANT_ID: envConfig.TENANT_ID ? '***' : 'not set',
    BACKEND_URL: envConfig.NEXT_PUBLIC_BACKEND_URL,
  });
}
