# Dockerfile for Spotify Service
# Service for Spotify API integration with Python and Node.js

FROM python:3.10-slim

# Install Node.js and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Node.js dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --upgrade pip && pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 soundforge && useradd -r -u 1001 -g soundforge soundforge

# Create directories with proper permissions
ENV TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache
RUN mkdir -p $TMP_PATH $CACHE_PATH && \
    chown -R soundforge:soundforge /app

# Switch to non-root user
USER soundforge

# Environment variables
ENV PORT=3001 \
    SERVICE_NAME=spotify-service \
    PYTHONPATH="/usr/local/lib/python3.10/site-packages" \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:${PATH}" \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Command to run the service
CMD ["node", "index.js"]