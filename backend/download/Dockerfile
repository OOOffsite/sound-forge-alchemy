# Dockerfile.download-service
# Service for downloading audio tracks

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
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy TypeScript configuration files
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Copy source code
COPY . .

# Build step
RUN npm run build

# Production stage
FROM sound-forge-alchemy-python-node-base
# Set working directory
WORKDIR /app
COPY requirements.txt ./

RUN python3 --version && \
    which python3 && \
    pip3 --version && \
    pip install --no-cache-dir --user -r ./requirements.txt

# Install ffmpeg and upgrade spotdl/yt-dlp to latest as root
USER root
RUN apt-get update && apt-get install -y ffmpeg
USER soundforge
RUN pip install --no-cache-dir --user --upgrade spotdl yt-dlp

# Copy application code
COPY --chown=soundforge:soundforge . .

# Add TMP_PATH and CACHE_PATH environment variables and directory creation
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

RUN mkdir -p $TMP_PATH $CACHE_PATH /app/audio_data && \
    chown -R soundforge:soundforge /app/audio_data

# Environment variables
ENV PORT=3002 \
    SERVICE_NAME=download-service \
    AUDIO_DATA_PATH=/app/audio_data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Expose port
EXPOSE 3002

# Define volumes
VOLUME ["/app/audio_data"]
RUN npm install express

# Command to run the service
CMD ["npm", "start"]