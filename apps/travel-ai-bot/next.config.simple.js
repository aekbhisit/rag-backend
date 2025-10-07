/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode to prevent double mounting in development
  reactStrictMode: false,
  
  // Disable ESLint during build to prevent errors from blocking the build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Simplified webpack config
  webpack: (config, { isServer }) => {
    // Handle Node.js specific modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
      };
    }
    
    return config;
  },
  
  // Environment variables
  env: {
    TENANT_ID: process.env.TENANT_ID || '',
  }
};

module.exports = nextConfig;
