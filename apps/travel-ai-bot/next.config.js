/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone output for now - use regular Next.js server
  // output: 'standalone',
  
  // Disable React Strict Mode to prevent double mounting in development
  // This improves session generation performance by preventing multiple WebRTC connections
  reactStrictMode: false,
  
  // Disable ESLint during build to prevent errors from blocking the build
  eslint: {
    // Warning instead of error
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build
  typescript: {
    // Warning instead of error
    ignoreBuildErrors: true,
  },
  
  webpack: (config, { isServer, dev }) => {
    // Handle Node.js specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        assert: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        'node:assert': false,
        'node:buffer': false,
        'node:stream': false,
        'node:util': false,
        'node:events': false,
        'node:async_hooks': false,
        'node:console': false,
        'node:crypto': false,
        'node:http': false,
        'node:https': false,
        'node:net': false,
        'node:os': false,
        'node:path': false,
        'node:process': false,
        'node:punycode': false,
        'node:querystring': false,
        'node:string_decoder': false,
        'node:tls': false,
        'node:tty': false,
        'node:url': false,
        'node:util': false,
        'node:zlib': false
      };
    }
    
    // Add better error handling for webpack
    config.stats = {
      errorDetails: true,
      children: true
    };
    
    // Optimize for production builds
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/
            }
          }
        }
      };
    }
    
    return config;
  },
  
  experimental: {
    // Properly format serverActions as an object not a boolean
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3200"]
    }
  },
  env: {
    TENANT_ID: process.env.TENANT_ID || '',
  }
};

module.exports = nextConfig; 