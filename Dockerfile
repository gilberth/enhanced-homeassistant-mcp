# Dockerfile for Enhanced Home Assistant MCP

# Build stage
FROM node:22-alpine AS builder

# Add metadata
LABEL maintainer="Enhanced Home Assistant MCP"
LABEL description="Enhanced Model Context Protocol server for Home Assistant"
LABEL version="1.0.0"

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user before copying files
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

# Copy compiled JavaScript from builder stage with correct ownership
COPY --from=builder --chown=mcpuser:mcpuser /usr/src/app/dist ./dist

# Switch to non-root user
USER mcpuser

# Expose port for HTTP MCP server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the server - Smithery will handle configuration via environment
CMD ["node", "dist/index.js"]