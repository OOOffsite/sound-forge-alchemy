# Dockerfile for Analysis Service
# Service for audio analysis using Essentia

FROM mtgupf/essentia:latest

# Install Node.js (LTS) and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    python3-pip \
    ca-certificates \
    gnupg \
    tini \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy Python requirements and install dependencies
COPY requirements.txt ./
RUN pip3 install --upgrade pip && pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 soundforge && useradd -r -u 1001 -g soundforge soundforge

# Create directories with proper permissions
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache \
    AUDIO_DATA_PATH=/app/audio_data
RUN mkdir -p $TMP_PATH $CACHE_PATH $AUDIO_DATA_PATH && \
    chown -R soundforge:soundforge /app

# Switch to non-root user
USER soundforge

# Environment variables
ENV PORT=3004 \
    SERVICE_NAME=analysis-service \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Expose port
EXPOSE 3004

# Define volumes
VOLUME ["/app/audio_data"]

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Command to run the service
CMD ["npm", "start"]