# Dockerfile for Frontend
# React/Vite application with multi-stage builds

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
USER soundforge
ENV PORT=8001 \
    NODE_ENV=development
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/ || exit 1
CMD ["npm", "run", "dev", "--", "--port", "8001", "--host", "0.0.0.0"]

# Stage 3: Builder (for production)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 4: Production (using nginx)
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || echo "server { listen 8001; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
RUN addgroup -g 1001 -S soundforge && adduser -S soundforge -u 1001 -G soundforge
RUN chown -R soundforge:soundforge /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx
USER soundforge
ENV PORT=8001 \
    NODE_ENV=production
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8001/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
