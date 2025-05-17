# Dockerfile.analysis-service
# Service for audio analysis using prebuilt Essentia image

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

# Copy Python requirements and install dependencies
COPY requirements.txt ./
RUN pip3 install --upgrade pip && pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories with proper permissions
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache
RUN mkdir -p $TMP_PATH $CACHE_PATH /app/audio_data

# Environment variables
ENV PORT=3004 \
    SERVICE_NAME=analysis-service \
    AUDIO_DATA_PATH=/app/audio_data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Expose port
EXPOSE 3004

# Define volumes
VOLUME ["/app/audio_data"]
RUN npm install
RUN npm install express
# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Command to run the service
CMD ["npm", "start"]