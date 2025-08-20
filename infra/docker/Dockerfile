# Multi-stage build for RAG Assistant
FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm && \
    apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files and workspace manifest (include workspace package manifests)
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY apps/*/package*.json ./apps/
COPY packages/*/package*.json ./packages/

# Install all dependencies (workspace-wide, include dev deps for building)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Ensure workspace dependencies are properly linked
RUN cd packages/shared && pnpm install --no-frozen-lockfile

# Build shared first, then backend
RUN pnpm run build:shared && pnpm run build:backend

# Production stage
FROM node:20-alpine AS production

# Install pnpm and dumb-init for proper signal handling
RUN npm install -g pnpm && \
    apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY apps/*/package*.json ./apps/
COPY packages/*/package*.json ./packages/

# Install all dependencies (including dev dependencies for now)
RUN pnpm install --no-frozen-lockfile

# Copy built application and all dependencies from base stage
COPY --from=base /app/apps/backend/dist ./apps/backend/dist
COPY --from=base /app/apps/backend/package*.json ./apps/backend/
COPY --from=base /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application from workspace root
CMD ["dumb-init", "sh", "-c", "cd /app && node apps/backend/dist/scripts/ensureTenant.js && node apps/backend/dist/scripts/ensureAdminUser.js && node apps/backend/dist/index.js"]
