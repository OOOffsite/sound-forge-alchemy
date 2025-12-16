# Dockerfile for WebSocket Service
# Service for real-time communication

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
RUN mkdir -p /app/tmp /app/cache && chown -R soundforge:soundforge /app/tmp /app/cache
USER soundforge
ENV PORT=3006 \
    SERVICE_NAME=websocket-service \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3006/health || exit 1
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=1001:1001 . .
RUN addgroup -g 1001 -S soundforge && adduser -S soundforge -u 1001 -G soundforge
RUN chown -R soundforge:soundforge /app
RUN mkdir -p /app/tmp /app/cache && chown -R soundforge:soundforge /app/tmp /app/cache
USER soundforge
ENV PORT=3006 \
    SERVICE_NAME=websocket-service \
    TMP_PATH=/app/tmp \
    CACHE_PATH=/app/cache \
    NODE_ENV=production
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3006/health || exit 1
CMD ["node", "index.js"]