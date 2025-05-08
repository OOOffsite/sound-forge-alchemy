# Sound Forge Alchemy Docker

This directory contains the Docker configuration for the Sound Forge Alchemy application.

## Getting Started

Sound Forge Alchemy uses Docker to create a consistent and isolated environment for development, testing, and production. The Docker architecture is designed to be flexible and run in different environments.

## Directory Structure

- **base-images/**: Base Dockerfiles for all services
- **service-images/**: Service-specific Dockerfiles
- **compose-files/**: Docker Compose configurations for different environments
- **config-files/**: Configuration files for services

## Pre-requisites

1. Install Docker and Docker Compose
2. Download dependencies (optional, but recommended):
   ```bash
   # Download PyTorch, Demucs models, and other large dependencies
   ./docker/download-dependencies.sh
   ```

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

# Copy and customize environment variables
cp .env.docker.example .env.docker
source .env.docker

# Start the platform services (Redis, PostgreSQL, etc.)
docker-compose -f docker/compose-files/docker-compose-platform.yml up -d

# Start the application services in development mode
docker-compose -f docker/compose-files/docker-compose.yml -f docker/compose-files/docker-compose.dev.yml up -d
```

### macOS Environment (Apple Silicon)

```bash
# Create the required Docker networks
docker network create sound-forge-frontend-network
docker network create sound-forge-api-gateway-network
docker network create sound-forge-data-network
docker network create sound-forge-websocket-network

# Download dependencies (optimized for Mac)
./docker/download-dependencies.sh

# Copy and customize environment variables
cp .env.docker.example .env.docker
source .env.docker

# Start the macOS-specific configuration
docker-compose -f docker/compose-files/docker-compose.yml -f docker/compose-files/docker-compose.mac.yml up -d
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

# Download dependencies (if using shared storage)
./docker/download-dependencies.sh

# Copy and customize environment variables
cp .env.docker.example .env.docker
source .env.docker

# Start the production configuration with GPU acceleration
export USE_GPU=true
export GPU_DRIVER=nvidia
export GPU_COUNT=1
export GPU_CAPABILITIES=gpu
docker-compose -f docker/compose-files/docker-compose.yml -f docker/compose-files/docker-compose.prod.yml up -d
```

## Environment Variables

The Docker configuration uses several environment variables that should be set before running the Docker Compose commands. See `.env.docker.example` for a complete list.

## Dependency Management

Large dependencies like PyTorch models and Demucs models are downloaded separately and mounted into the containers to avoid downloading them during container build time. This saves both time and space.

### Managing Dependencies

1. Run the dependency download script:
   ```bash
   ./docker/download-dependencies.sh
   ```

2. This script will:
   - Create a `deps/` directory in the project root
   - Download PyTorch based on your system (CPU, CUDA, or MPS for Mac)
   - Download Demucs models
   - Set up spotdl cache directory
   - Create environment variables in `.env.deps`

3. Use the environment variables in your Docker Compose commands:
   ```bash
   source .env.deps
   ```

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