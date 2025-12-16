# Dockerfile for Processing Service
# Service for audio separation with Demucs (CPU/GPU support via build args)

# Use Python 3.10 slim as base (can be overridden for GPU)
ARG BASE_IMAGE=python:3.10-slim
FROM ${BASE_IMAGE}

# Install Node.js, ffmpeg, and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    ca-certificates \
    gnupg \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Node.js dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy and install Python dependencies (including Demucs)
COPY requirements.txt ./
RUN pip3 install --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt && \
    pip3 install --no-cache-dir demucs

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 soundforge && useradd -r -u 1001 -g soundforge soundforge

# Create directories with proper permissions
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache \
    AUDIO_DATA_PATH=/app/audio_data \
    PYTORCH_MODEL_PATH=/app/models
RUN mkdir -p $TMP_PATH $CACHE_PATH $AUDIO_DATA_PATH $PYTORCH_MODEL_PATH && \
    chown -R soundforge:soundforge /app

# Switch to non-root user
USER soundforge

# Environment variables
ARG USE_GPU=false
ENV PORT=3003 \
    SERVICE_NAME=processing-service \
    USE_GPU=${USE_GPU} \
    NODE_OPTIONS="--max-old-space-size=4096" \
    PYTHONPATH="/usr/local/lib/python3.10/site-packages" \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:${PATH}" \
    DEMUCS_THREADS=4 \
    DEMUCS_MEMORY=4096 \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Expose port
EXPOSE 3003

# Define volumes
VOLUME ["/app/audio_data", "/app/models"]

# Command to run the service
CMD ["npm", "start"]