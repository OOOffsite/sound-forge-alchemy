# Dockerfile for API Gateway
# API Gateway service for routing client requests to backend services

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Development
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm install
COPY . .
RUN addgroup -g 1001 -S soundforge && adduser -S soundforge -u 1001 -G soundforge
RUN chown -R soundforge:soundforge /app
RUN mkdir -p /app/tmp /app/cache /app/audio_data && chown -R soundforge:soundforge /app/tmp /app/cache /app/audio_data
USER soundforge
ENV PORT=3000 \
    SERVICE_NAME=api-gateway \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
VOLUME ["/app/audio_data"]
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=1001:1001 . .
RUN addgroup -g 1001 -S soundforge && adduser -S soundforge -u 1001 -G soundforge
RUN chown -R soundforge:soundforge /app
RUN mkdir -p /app/tmp /app/cache /app/audio_data && chown -R soundforge:soundforge /app/tmp /app/cache /app/audio_data
USER soundforge
ENV PORT=3000 \
    SERVICE_NAME=api-gateway \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache \
    NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
VOLUME ["/app/audio_data"]
CMD ["node", "index.js"]