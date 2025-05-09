# Dockerfile.websocket-service
# Service for real-time communication

FROM sound-forge-alchemy-node-base:latest AS builder
# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
USER root
RUN npm install 
RUN npm ci

# Install TypeScript globally to ensure `tsc` is available
RUN npm install -g typescript

USER soundforge

# Copy source code
COPY . .

# Copy the tsconfig.json file to the build context
COPY tsconfig.json ./

# Copy TypeScript configuration files
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Build the application if needed
RUN npm run build

# Production stage
FROM sound-forge-alchemy-node-base:latest

# Set working directory
WORKDIR /app

# Add TMP_PATH and CACHE_PATH environment variables and directory creation
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

RUN mkdir -p $TMP_PATH $CACHE_PATH

# Copy built dependencies and application code
COPY --from=builder --chown=soundforge:soundforge /build/node_modules /app/node_modules
COPY --from=builder --chown=soundforge:soundforge /build/dist /app/dist
COPY --chown=soundforge:soundforge package*.json ./

# Environment variables
ENV PORT=3006 \
    SERVICE_NAME=websocket-service

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3006/health || exit 1

# Expose port
EXPOSE 3006

# Command to run the service
CMD ["node", "dist/server.js"]