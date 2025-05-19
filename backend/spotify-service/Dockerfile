# Dockerfile.spotify-service
# Service for Spotify API integration

FROM sound-forge-alchemy-python-node-base:latest AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
USER root
RUN npm install && \
    npm install express && \
    npm ci

# Verify Python installation as root (soundforge user does not exist in this image)
RUN python3 --version && \
    which python3 && \
    pip3 --version

# Copy Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt 

# Copy TypeScript configuration files
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Copy source code
COPY . .

# # Build the application if needed
# RUN npm run build

# Production stage
FROM sound-forge-alchemy-python-node-base:latest

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=soundforge:soundforge . .
COPY --from=builder --chown=soundforge:soundforge /usr/local/lib/python3.10/site-packages "/usr/local/lib/python3.10/site-packages"

# Environment variables
ENV PORT=3001 \
    SERVICE_NAME=spotify-service \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

# Add Python to PATH and set Python environment variables
ENV PYTHONPATH="/usr/local/lib/python3.10/site-packages"
ENV PYTHONPATH="${PYTHONPATH}:${PYTHONPATH:-}" \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:${PATH}"

# Create necessary directories
RUN mkdir -p $TMP_PATH $CACHE_PATH

# Switch to non-root user (soundforge exists in this image)
USER soundforge

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001
RUN npm install express

# Command to run the service
CMD ["node", "index.js"]