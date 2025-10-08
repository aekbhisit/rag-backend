# Single-stage build for RAG Backend (Production Ready)
FROM node:20-alpine

# Install pnpm and build dependencies
RUN npm install -g pnpm@10.14.0 && \
    apk add --no-cache dumb-init python3 make g++ && \
    apk cache clean

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files and workspace manifest for dependency installation
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy package.json files preserving directory structure
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/backend/src ./apps/backend/src
COPY packages/shared/src ./packages/shared/src
COPY apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.base.json ./

# Build shared package first, then backend
RUN pnpm run build:shared && pnpm run build:backend

# Clean up: remove source files and dev dependencies, keep only built artifacts and prod deps
# Note: Keep all production dependencies - don't reinstall to avoid missing modules
RUN rm -rf apps/backend/src packages/shared/src *.tsbuildinfo && \
    rm -rf apps/*/tsconfig.json packages/*/tsconfig.json tsconfig.base.json && \
    rm -rf node_modules/@types && \
    rm -rf node_modules/typescript && \
    rm -rf node_modules/rimraf && \
    rm -rf node_modules/concurrently && \
    ln -sf .pnpm/pg@8.16.3/node_modules/pg node_modules/pg && \
    ln -sf .pnpm/express@4.21.2/node_modules/express node_modules/express && \
    ln -sf .pnpm/cors@2.8.5/node_modules/cors node_modules/cors && \
    ln -sf .pnpm/bcryptjs@2.4.3/node_modules/bcryptjs node_modules/bcryptjs && \
    ln -sf .pnpm/helmet@7.2.0/node_modules/helmet node_modules/helmet && \
    ln -sf .pnpm/jsonwebtoken@9.0.2/node_modules/jsonwebtoken node_modules/jsonwebtoken && \
    ln -sf .pnpm/morgan@1.10.1/node_modules/morgan node_modules/morgan && \
    ln -sf .pnpm/redis@4.7.1/node_modules/redis node_modules/redis && \
    ln -sf .pnpm/zod@3.25.76/node_modules/zod node_modules/zod

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dumb-init", "sh", "-c", "node apps/backend/dist/scripts/ensureTenant.js && node apps/backend/dist/scripts/ensureAdminUser.js && node apps/backend/dist/index.js"]
