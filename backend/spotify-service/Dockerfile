# Dockerfile.spotify-service
# Service for Spotify API integration

FROM sound-forge-alchemy-node-base:latest AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
USER root
RUN npm install 
RUN npm ci
USER soundforge

# Copy TypeScript configuration files
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Copy source code
COPY . .

# Build the application if needed
RUN npm run build

# Production stage
FROM sound-forge-alchemy-node-base:latest


# Set working directory
WORKDIR /app

# Copy built dependencies and application code
COPY --from=builder --chown=soundforge:soundforge /build/node_modules /app/node_modules
COPY --from=builder --chown=soundforge:soundforge /build/dist /app/dist
COPY --chown=soundforge:soundforge package*.json ./

# Environment variables
ENV PORT=3001 \
    SERVICE_NAME=spotify-service \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

# Create necessary directories
RUN mkdir -p $TMP_PATH $CACHE_PATH

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Command to run the service
CMD ["node", "dist/server.js"]