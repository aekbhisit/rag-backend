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
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from base stage
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/backend/dist ./apps/backend/dist

# Create symlinks for critical dependencies
RUN ln -sf .pnpm/pg@8.16.3/node_modules/pg node_modules/pg && \
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
