# Single-stage build for RAG Assistant
FROM node:20-alpine

# Install pnpm and build dependencies (combine in one layer for efficiency)
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

# Copy only source code (exclude built artifacts, node_modules, etc.)
COPY apps/backend/src ./apps/backend/src
COPY packages/shared/src ./packages/shared/src
COPY apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.base.json ./

# Build shared package first, then backend
RUN pnpm run build:shared && pnpm run build:backend

# Clean up: remove source files and dev dependencies, keep only built artifacts and prod deps
RUN rm -rf apps/backend/src packages/shared/src *.tsbuildinfo && \
    rm -rf apps/*/tsconfig.json packages/*/tsconfig.json tsconfig.base.json && \
    pnpm prune --prod

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
