#!/bin/bash

# Build script for Sound Forge Alchemy Backend Services
# Installs shared dependencies and all service dependencies

set -e  # Exit on any error

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES=("shared" "api-gateway" "spotify" "download" "processing" "analysis" "websocket")

echo "🚀 Building Sound Forge Alchemy Backend Services..."
echo "Backend directory: $BACKEND_DIR"

# Function to install dependencies for a service
install_service_deps() {
    local service=$1
    local service_path="$BACKEND_DIR/$service"
    
    if [ -d "$service_path" ]; then
        echo "📦 Installing dependencies for $service..."
        cd "$service_path"
        
        if [ "$service" = "shared" ]; then
            # Install shared dependencies first
            npm install --production=false
            echo "✅ Shared module dependencies installed"
        else
            # Install service-specific dependencies
            npm install --production=false
            echo "✅ $service dependencies installed"
        fi
    else
        echo "⚠️  Service directory not found: $service_path"
    fi
}

# Function to build TypeScript services
build_typescript_service() {
    local service=$1
    local service_path="$BACKEND_DIR/$service"
    
    if [ -f "$service_path/tsconfig.json" ]; then
        echo "🔨 Building TypeScript service: $service..."
        cd "$service_path"
        npm run build
        echo "✅ $service TypeScript build completed"
    fi
}

# Install shared dependencies first (required by all services)
echo "🔧 Installing shared module..."
install_service_deps "shared"

# Install dependencies for all services
for service in "${SERVICES[@]}"; do
    if [ "$service" != "shared" ]; then
        install_service_deps "$service"
    fi
done

# Build TypeScript services
echo "🔨 Building TypeScript services..."
for service in "${SERVICES[@]}"; do
    build_typescript_service "$service"
done

# Create symlinks for easier development (optional)
echo "🔗 Creating development symlinks..."
for service in "${SERVICES[@]}"; do
    if [ "$service" != "shared" ]; then
        service_path="$BACKEND_DIR/$service"
        if [ -d "$service_path/node_modules" ] && [ ! -L "$service_path/node_modules/@sound-forge-alchemy" ]; then
            cd "$service_path/node_modules"
            mkdir -p "@sound-forge-alchemy"
            cd "@sound-forge-alchemy"
            ln -sf "../../../shared" "shared"
            echo "✅ Created symlink for $service"
        fi
    fi
done

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Shared module: ✅"
for service in "${SERVICES[@]}"; do
    if [ "$service" != "shared" ]; then
        echo "  - $service service: ✅"
    fi
done

echo ""
echo "🚀 To start development:"
echo "  cd $BACKEND_DIR/[service-name]"
echo "  npm run dev"
echo ""
echo "🐳 Or use Docker:"
echo "  docker-compose up --build"