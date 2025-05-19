# Dockerfile.api-gateway
# API Gateway service for routing client requests to backend services

FROM sound-forge-alchemy-node-base:latest AS builder

# Set working directory for the build stage
WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./
RUN npm install --no-package-lock
RUN npm ci

# Copy source code
COPY . .

# Build the application if needed
RUN npm run build

# Production image
FROM sound-forge-alchemy-node-base:latest


# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=soundforge:soundforge /build/dist /app/dist
COPY --from=builder --chown=soundforge:soundforge /build/package*.json /app/

# Copy necessary files
COPY --chown=soundforge:soundforge ./config /app/config

# Environment variables
ENV PORT=3000 \
    SERVICE_NAME=api-gateway \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

# Add TMP_PATH and CACHE_PATH directory creation
RUN mkdir -p $TMP_PATH $CACHE_PATH

# Health check specific to API Gateway
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose API Gateway port
EXPOSE 3000

# Command to run the service
CMD ["node", "dist/server.js"]