# Sound Forge Alchemy Docker

This directory contains the Docker configuration for the Sound Forge Alchemy application.

## Getting Started

Sound Forge Alchemy uses Docker to create a consistent and isolated environment for development, testing, and production. The Docker architecture is designed to be flexible and run in different environments.

## Directory Structure

- **base/**: Base Dockerfiles for all services
- **services/**: Service-specific Dockerfiles
- **compose/**: Docker Compose configurations for different environments
- **config/**: Configuration files for services

## How to Use

### Development Environment

```bash
# Create the required Docker networks
docker network create sound-forge-frontend-network
docker network create sound-forge-api-gateway-network
docker network create sound-forge-service-mesh-network
docker network create sound-forge-data-network
docker network create sound-forge-websocket-network
docker network create sound-forge-monitoring-network

# Start the platform services (Redis, PostgreSQL, etc.)
docker-compose -f docker/compose/docker-compose-platform.yml up -d

# Start the application services in development mode
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.dev.yml up -d
```

### macOS Environment (Apple Silicon)

```bash
# Create the required Docker networks
docker network create sound-forge-frontend-network
docker network create sound-forge-api-gateway-network
docker network create sound-forge-data-network
docker network create sound-forge-websocket-network

# Start the macOS-specific configuration
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.mac.yml up -d
```

### Production Environment

```bash
# Create the required Docker networks
docker network create --driver overlay sound-forge-frontend-network
docker network create --driver overlay sound-forge-api-gateway-network
docker network create --driver overlay sound-forge-service-mesh-network
docker network create --driver overlay sound-forge-data-network
docker network create --driver overlay sound-forge-websocket-network
docker network create --driver overlay sound-forge-monitoring-network

# Start the production configuration with GPU acceleration
USE_GPU=true docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.prod.yml up -d
```

## Environment Variables

The Docker configuration uses several environment variables that should be set before running the Docker Compose commands:

### Required Environment Variables

- `SUPABASE_URL`: The URL of the Supabase instance
- `SUPABASE_KEY`: The API key for the Supabase instance
- `SPOTIFY_CLIENT_ID`: The Spotify API client ID
- `SPOTIFY_CLIENT_SECRET`: The Spotify API client secret
- `REDIS_PASSWORD`: The password for Redis (defaults to "redispassword" in development)

### Optional Environment Variables

- `USE_GPU`: Whether to use GPU acceleration for the processing service (default: false)
- `GPU_DRIVER`: The GPU driver to use (default: none)
- `GPU_COUNT`: The number of GPUs to use (default: 0)
- `GPU_CAPABILITIES`: The GPU capabilities to use

## Service Endpoints

- Frontend: http://localhost:8001
- API Gateway: http://localhost:3000
- Spotify Service: http://localhost:3001
- Download Service: http://localhost:3002
- Processing Service: http://localhost:3003
- Analysis Service: http://localhost:3004
- WebSocket Service: ws://localhost:3006
- Redis: redis://localhost:6379
- Redis Commander (dev only): http://localhost:8081
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

## Learn More

For a detailed explanation of the Docker architecture, see the [ARCHITECTURE.md](./ARCHITECTURE.md) file.