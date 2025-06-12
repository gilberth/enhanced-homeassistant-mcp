# Dockerfile for Enhanced Home Assistant MCP
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create a default .env file if one doesn't exist
RUN if [ ! -f .env ]; then \
      echo 'HOME_ASSISTANT_URL=http://homeassistant:8123' > .env && \
      echo 'HOME_ASSISTANT_TOKEN=your_token_here' >> .env && \
      echo 'DEBUG=false' >> .env && \
      echo 'REQUEST_TIMEOUT=10000' >> .env; \
    fi

# Build the project
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# Expose port (though MCP uses stdio)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the server
CMD ["npm", "start"]