# Docker Configuration Migration Guide

## Overview

This guide explains how to migrate from the old complex Docker setup to the new unified, simplified configuration for Sound Forge Alchemy.

## What Changed

### Before (Complex Setup)
- **Multiple compose files**: `docker/compose/docker-compose.dev.yml`, `docker-compose.prod.yml`, etc.
- **Scattered Dockerfiles**: Root, `/docker/base-images/`, `/docker/service-images/`
- **6+ Docker networks**: Over-complicated networking
- **Complex management script**: `docker-manager.sh` with many options

### After (Simplified Setup)
- **Single compose file**: `docker-compose.yml` with profiles
- **Consolidated Dockerfiles**: All in `/docker/` directory
- **2 networks**: `external` and `internal`
- **Simple management**: `docker-setup.sh` with clear commands

## New File Structure

```
docker/
├── Dockerfile.node-base          # Base Node.js image
├── Dockerfile.frontend           # React/Vite frontend
├── Dockerfile.api-gateway        # API Gateway service
├── Dockerfile.spotify-service    # Spotify integration
├── Dockerfile.download-service   # Audio download service
├── Dockerfile.processing-service # Audio processing (CPU/GPU)
├── Dockerfile.analysis-service   # Audio analysis
├── Dockerfile.websocket-service  # WebSocket communication
└── config/
    ├── nginx.conf               # Frontend server config
    └── redis.conf               # Redis configuration
```

## Migration Steps

### 1. Backup Current Setup
```bash
# Create backup of old configuration
cp docker-compose.yml docker-compose.yml.backup
cp -r docker/compose docker/compose.backup
cp docker-manager.sh docker-manager.sh.backup
```

### 2. Stop Current Services
```bash
# Using old setup
./docker-manager.sh -a down
```

### 3. Clean Up Old Resources
```bash
# Remove old networks (optional)
docker network rm sound-forge-frontend-network || true
docker network rm sound-forge-api-gateway-network || true
docker network rm sound-forge-service-mesh-network || true
docker network rm sound-forge-websocket-network || true

# Clean up old images (optional)
docker image prune -f
```

### 4. Set Up Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

### 5. Build and Start New Setup
```bash
# Make the new script executable
chmod +x docker-setup.sh

# Start development environment
./docker-setup.sh -p dev up

# Or start production environment
./docker-setup.sh -p prod up
```

## New Usage Examples

### Development
```bash
# Start dev environment
./docker-setup.sh up
# OR
./docker-setup.sh -p dev up

# View logs for specific service
./docker-setup.sh -s frontend logs

# Restart specific service
./docker-setup.sh -s api-gateway restart

# Stop everything
./docker-setup.sh down
```

### Production
```bash
# Start production (CPU)
./docker-setup.sh -p prod up

# Start production with GPU
./docker-setup.sh -p prod -g up

# Build specific service
./docker-setup.sh -p prod -s processing-service build
```

### Utility Commands
```bash
# Check service status
./docker-setup.sh status

# Clean up everything
./docker-setup.sh clean

# Build base images
./docker-setup.sh -p build up
```

## Network Architecture Changes

### Old Networks (6 networks)
- `sound-forge-frontend-network`
- `sound-forge-api-gateway-network` 
- `sound-forge-service-mesh-network`
- `sound-forge-data-network`
- `sound-forge-websocket-network`
- `sound-forge-monitoring-network`

### New Networks (2 networks)
- **`external`**: Frontend ↔ API Gateway (public-facing)
- **`internal`**: All backend service communication

This simplified approach maintains security while reducing complexity.

## Environment Variables

The new setup uses a single `.env` file instead of multiple configuration files:

```env
# Core settings
NODE_ENV=development
USE_GPU=false

# API keys
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Optional resource limits
FRONTEND_CPU_LIMIT=0.8
FRONTEND_MEMORY_LIMIT=1G
```

## Docker Profiles

The new setup uses Docker Compose profiles:

- **`dev`**: Development environment with hot reload
- **`prod`**: Production environment with optimizations
- **`build`**: Build base images only

## Volume Management

### Shared Volumes
- `shared_audio`: Audio files across services
- `shared_cache`: Processing cache
- `shared_tmp`: Temporary files
- `shared_logs`: Centralized logging
- `redis_data`: Redis persistence

### Development Volumes
Source code is automatically mounted in development mode for hot reload.

## Troubleshooting

### Port Conflicts
If you get port binding errors, check what's using the ports:
```bash
# Check port usage
lsof -i :3000
lsof -i :8001

# Stop conflicting services
sudo pkill -f "node.*3000"
```

### Permission Issues
```bash
# Fix Docker permissions
sudo chown -R $USER:$USER ./docker-shared
```

### GPU Issues
```bash
# Check NVIDIA Docker support
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Enable GPU in production
./docker-setup.sh -p prod -g up
```

### Build Issues
```bash
# Force rebuild all images
docker-setup.sh -p dev build
docker system prune -f
```

## Benefits of New Setup

1. **Simplified Management**: Single script with clear commands
2. **Reduced Complexity**: 2 networks instead of 6+
3. **Better Organization**: All Dockerfiles in one place
4. **Environment Consistency**: Same compose file for dev/prod
5. **Resource Control**: Configurable CPU/memory limits
6. **Security**: Non-root containers by default
7. **Development Experience**: Hot reload in all services

## Rollback Plan

If you need to rollback to the old setup:

```bash
# Stop new setup
./docker-setup.sh down

# Restore old files
cp docker-compose.yml.backup docker-compose.yml
cp -r docker/compose.backup docker/compose
cp docker-manager.sh.backup docker-manager.sh

# Start old setup
./docker-manager.sh -e dev -a up
```

## Support

If you encounter issues:

1. Check the logs: `./docker-setup.sh logs`
2. Verify environment variables in `.env`
3. Ensure Docker and Docker Compose are updated
4. Try a clean rebuild: `./docker-setup.sh clean && ./docker-setup.sh up`

The new setup maintains all functionality while significantly simplifying Docker management for Sound Forge Alchemy.