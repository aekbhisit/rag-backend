# Multi-stage build for RAG Admin Web
FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN npm install -g pnpm@10.14.0 && \
    apk add --no-cache python3 make g++ && \
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
COPY apps/admin-web/package*.json ./apps/admin-web/

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/admin-web/app ./apps/admin-web/app
COPY apps/admin-web/components ./apps/admin-web/components
COPY apps/admin-web/hooks ./apps/admin-web/hooks
COPY apps/admin-web/lib ./apps/admin-web/lib
COPY apps/admin-web/styles ./apps/admin-web/styles
COPY apps/admin-web/utils ./apps/admin-web/utils
COPY apps/admin-web/public ./apps/admin-web/public
COPY apps/admin-web/next.config.mjs ./apps/admin-web/
COPY apps/admin-web/tsconfig.json ./apps/admin-web/
COPY apps/admin-web/next-env.d.ts ./apps/admin-web/
COPY apps/admin-web/tailwind.config.js ./apps/admin-web/
COPY apps/admin-web/postcss.config.js ./apps/admin-web/
COPY tsconfig.base.json ./

# Build shared package first, then admin-web
RUN pnpm run build:shared && pnpm run build:admin

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
COPY apps/admin-web/package*.json ./apps/admin-web/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from base stage
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/admin-web/.next ./apps/admin-web/.next
COPY --from=base /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=base /app/apps/admin-web/next.config.mjs ./apps/admin-web/

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dumb-init", "node", "apps/admin-web/.next/standalone/server.js"]
