# Dockerfile.processing-service
# Service for audio separation with Demucs

FROM sound-forge-alchemy-gpu-base:latest AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
USER root
RUN npm install 
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
FROM sound-forge-alchemy-gpu-base:latest

# Set working directory
WORKDIR /app

# Copy built dependencies and application code
COPY --from=builder --chown=soundforge:soundforge /build/node_modules /app/node_modules
COPY --chown=soundforge:soundforge . .

# Create directories with proper permissions
RUN mkdir -p /app/tmp /app/cache /app/audio_data /app/models && \
    chown -R soundforge:soundforge /app/audio_data /app/models

# Environment variables
ENV PORT=3003 \
    SERVICE_NAME=processing-service \
    AUDIO_DATA_PATH=/app/audio_data \
    USE_GPU=true \
    PYTORCH_MODEL_PATH=/app/models \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache

# Resource tuning (uncomment and adjust as needed)
ENV NODE_OPTIONS="--max-old-space-size=4096"  
# Node.js memory limit in MB
# ENV OMP_NUM_THREADS=4                         # Number of OpenMP threads (for numpy, pytorch, demucs)
# ENV MKL_NUM_THREADS=4                         # Number of MKL threads
# ENV NUMEXPR_NUM_THREADS=4                     # Number of threads for numexpr
ENV PYTHONUNBUFFERED=1                        
# Ensures real-time Python logging
# ENV PYTHONWARNINGS="ignore"                   # Suppress Python warnings
ENV DEMUCS_THREADS=4                          
# Demucs-specific thread count (if supported)
ENV DEMUCS_MEMORY=4096                        
# Demucs-specific memory limit in MB (if supported)
# ENV CUDA_VISIBLE_DEVICES=0                    # GPU selection (if using CUDA)
# ENV TF_CPP_MIN_LOG_LEVEL=2                    # TensorFlow log level (if relevant)

RUN pip install demucs

# Add Python to PATH and set Python environment variables   
ENV PYTHONPATH="/usr/local/lib/python3.10/site-packages"
ENV PYTHONPATH="${PYTHONPATH}:${PYTHONPATH:-}" \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:${PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Expose port
EXPOSE 3003

# Define volumes
VOLUME ["/app/audio_data", "/app/models"]

# Command to run the service
CMD ["npm", "start"]