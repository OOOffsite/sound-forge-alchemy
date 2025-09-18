#!/bin/bash

# Optimized Docker Build Script
# Builds base images first, then services with proper caching

set -e

echo "🚀 Building optimized Docker images for Sound Forge Alchemy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for environment
ENV=${1:-development}
echo "Building for environment: $ENV"

# Function to build with progress
build_image() {
    local service=$1
    echo -e "${YELLOW}Building $service...${NC}"
    
    if docker compose -f docker-compose.optimized.yml build --progress=plain $service; then
        echo -e "${GREEN}✓ $service built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build $service${NC}"
        exit 1
    fi
}

# Step 1: Build base images first (these are cached and shared)
echo -e "\n${YELLOW}Step 1: Building base images...${NC}"
export NODE_ENV=$ENV
docker compose -f docker-compose.optimized.yml --profile build build --parallel node-base python-node-base

# Step 2: Build all services in parallel (they'll use the cached base images)
echo -e "\n${YELLOW}Step 2: Building service images...${NC}"
docker compose -f docker-compose.optimized.yml --profile $ENV build --parallel

# Step 3: Prune old images (optional)
echo -e "\n${YELLOW}Step 3: Cleaning up...${NC}"
docker image prune -f

echo -e "\n${GREEN}✅ All images built successfully!${NC}"
echo -e "\nTo start services, run:"
echo -e "  ${GREEN}docker compose -f docker-compose.optimized.yml --profile $ENV up${NC}"
echo -e "\nFor GPU support, add:"
echo -e "  ${GREEN}docker compose -f docker-compose.optimized.yml -f docker-compose.gpu-optimized.yml --profile $ENV up${NC}"