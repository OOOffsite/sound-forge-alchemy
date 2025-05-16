# Dockerfile.analysis-service
# Service for audio analysis

FROM sound-forge-alchemy-python-node-base AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
USER root
RUN npm install 
RUN npm install express
RUN npm ci
USER soundforge

# Copy Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy TypeScript configuration files
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Copy source code
COPY . .

# Production stage
FROM sound-forge-alchemy-python-node-base
# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=soundforge:soundforge . .

# Create directories with proper permissions
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

RUN mkdir -p $TMP_PATH $CACHE_PATH /app/audio_data && \
    chown -R soundforge:soundforge /app/audio_data

# Environment variables
ENV PORT=3004 \
    SERVICE_NAME=analysis-service \
    AUDIO_DATA_PATH=/app/audio_data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Expose port
EXPOSE 3004
RUN npm install express

# Define volumes
VOLUME ["/app/audio_data"]

# Command to run the service
CMD ["npm", "start"]