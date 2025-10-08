# Single-stage build for Travel AI Bot (Production Ready)
FROM node:20-alpine

# Install pnpm and build dependencies
RUN npm install -g pnpm@10.14.0 && \
    apk add --no-cache dumb-init python3 make g++ git && \
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
COPY packages/shared/package*.json ./packages/shared/
COPY apps/travel-ai-bot/package*.json ./apps/travel-ai-bot/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/travel-ai-bot/src ./apps/travel-ai-bot/src
COPY apps/travel-ai-bot/public ./apps/travel-ai-bot/public
COPY apps/travel-ai-bot/next.config.js ./apps/travel-ai-bot/
COPY apps/travel-ai-bot/tailwind.config.ts ./apps/travel-ai-bot/ 2>/dev/null || true
COPY apps/travel-ai-bot/postcss.config.mjs ./apps/travel-ai-bot/ 2>/dev/null || true
COPY apps/travel-ai-bot/tsconfig.json ./apps/travel-ai-bot/
COPY apps/travel-ai-bot/next-env.d.ts ./apps/travel-ai-bot/ 2>/dev/null || true
COPY apps/travel-ai-bot/eslint.config.mjs ./apps/travel-ai-bot/ 2>/dev/null || true
COPY tsconfig.base.json ./

# Note: thaiResortGuide agent removed - using database agents only

# Build shared package first, then travel-ai-bot
RUN pnpm run build:shared && NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:travel

# Clean up: remove source files and dev dependencies, keep only built artifacts and prod deps
# Note: Keep all production dependencies - don't reinstall to avoid missing modules
RUN rm -rf apps/travel-ai-bot/src packages/shared/src *.tsbuildinfo && \
    rm -rf apps/*/tsconfig.json packages/*/tsconfig.json tsconfig.base.json && \
    rm -rf node_modules/@types && \
    rm -rf node_modules/typescript && \
    rm -rf node_modules/rimraf && \
    rm -rf node_modules/concurrently

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application using pnpm (standard Next.js start)
CMD ["dumb-init", "sh", "-c", "cd apps/travel-ai-bot && pnpm run start"]
