# Multi-stage build for RAG Backend
FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm@10.14.0 && \
    apk add --no-cache dumb-init python3 make g++ && \
    apk cache clean

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files from root and workspace
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy package.json files for workspace packages
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig.json ./apps/backend/
COPY tsconfig.base.json ./

# Build shared package first, then backend
RUN pnpm run build:shared && pnpm run build:backend

# Production stage
FROM node:20-alpine AS production

# Install pnpm and runtime dependencies
RUN npm install -g pnpm@10.14.0 && \
    apk add --no-cache dumb-init && \
    apk cache clean

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files from root and workspace
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy package.json files for workspace packages
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built artifacts from base stage
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/backend/dist ./apps/backend/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json

# Install dependencies in workspace packages
RUN cd packages/shared && pnpm install --prod --no-frozen-lockfile && cd ../.. && \
    cd apps/backend && pnpm install --prod --no-frozen-lockfile && cd ../..

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
