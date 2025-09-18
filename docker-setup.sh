#!/bin/bash

# Sound Forge Alchemy - Docker Setup Script
# Simplified replacement for docker-manager.sh
# Uses standard docker compose commands with profiles

set -e

# Text colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
PROFILE="dev"
ACTION="up"
SERVICE=""
GPU_ENABLED=false

# Show help
show_help() {
    cat << EOF
${BLUE}Sound Forge Alchemy - Docker Setup${NC}

Usage: $0 [OPTIONS] [ACTION]

${YELLOW}Profiles:${NC}
  dev     Development environment (default)
  prod    Production environment
  build   Build base images only

${YELLOW}Actions:${NC}
  up      Start services (default)
  down    Stop services
  restart Restart services
  logs    Show logs
  build   Build images
  clean   Clean up containers and images
  status  Show service status

${YELLOW}Options:${NC}
  -p, --profile PROFILE   Set profile (dev/prod/build)
  -s, --service SERVICE   Target specific service
  -g, --gpu              Enable GPU support (prod only)
  -h, --help             Show this help

${YELLOW}Examples:${NC}
  $0                           # Start dev environment
  $0 -p dev up                 # Start dev environment
  $0 -p prod -g up             # Start prod with GPU
  $0 -p dev -s frontend logs   # Show frontend logs
  $0 down                      # Stop all services
  $0 clean                     # Clean up everything

${YELLOW}Environment Variables:${NC}
  NODE_ENV                     Set to 'production' for prod builds
  USE_GPU                      Set to 'true' for GPU acceleration
  SPOTIFY_CLIENT_ID            Required for Spotify integration
  SPOTIFY_CLIENT_SECRET        Required for Spotify integration
  REDIS_PASSWORD               Optional Redis password
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -g|--gpu)
            GPU_ENABLED=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        up|down|restart|logs|build|clean|status)
            ACTION="$1"
            shift
            ;;
        *)
            echo -e "${RED}Error: Unknown option '$1'${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate profile
if [[ "$PROFILE" != "dev" && "$PROFILE" != "prod" && "$PROFILE" != "build" ]]; then
    echo -e "${RED}Error: Invalid profile '$PROFILE'. Use 'dev', 'prod', or 'build'.${NC}"
    exit 1
fi

# Set environment variables based on profile
setup_environment() {
    if [[ "$PROFILE" == "prod" ]]; then
        export NODE_ENV=production
        if [[ "$GPU_ENABLED" == true ]]; then
            export USE_GPU=true
            export GPU_COUNT=1
        else
            export USE_GPU=false
            export GPU_COUNT=0
        fi
    else
        export NODE_ENV=development
        export USE_GPU=false
        export GPU_COUNT=0
    fi

    # Load environment variables from .env files if they exist
    if [[ -f .env ]]; then
        echo -e "${GREEN}Loading environment variables from .env${NC}"
        set -a
        source .env
        set +a
    fi

    if [[ -f .env.local ]]; then
        echo -e "${GREEN}Loading environment variables from .env.local${NC}"
        set -a
        source .env.local
        set +a
    fi
}

# Build base images
build_base() {
    echo -e "${YELLOW}Building base images...${NC}"
    docker compose --profile build build node-base
}

# Main execution function
execute_action() {
    local cmd_args="--profile $PROFILE"
    
    if [[ -n "$SERVICE" ]]; then
        cmd_args="$cmd_args $SERVICE"
    fi

    case $ACTION in
        up)
            echo -e "${YELLOW}Starting $PROFILE environment...${NC}"
            if [[ "$PROFILE" == "build" ]]; then
                build_base
            else
                # Build base image first if it doesn't exist
                if ! docker image inspect sound-forge-node-base:latest >/dev/null 2>&1; then
                    build_base
                fi
                docker compose $cmd_args up -d --build
                echo -e "${GREEN}Services started!${NC}"
                docker compose $cmd_args ps
            fi
            ;;
        down)
            echo -e "${YELLOW}Stopping services...${NC}"
            docker compose $cmd_args down
            echo -e "${GREEN}Services stopped!${NC}"
            ;;
        restart)
            echo -e "${YELLOW}Restarting services...${NC}"
            docker compose $cmd_args restart ${SERVICE}
            echo -e "${GREEN}Services restarted!${NC}"
            ;;
        logs)
            echo -e "${YELLOW}Showing logs...${NC}"
            docker compose $cmd_args logs -f ${SERVICE}
            ;;
        build)
            echo -e "${YELLOW}Building images...${NC}"
            if [[ "$PROFILE" == "build" ]]; then
                build_base
            else
                docker compose $cmd_args build ${SERVICE}
            fi
            echo -e "${GREEN}Build complete!${NC}"
            ;;
        clean)
            echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
            docker compose --profile dev --profile prod down -v --remove-orphans
            docker system prune -f
            echo -e "${GREEN}Cleanup complete!${NC}"
            ;;
        status)
            echo -e "${YELLOW}Service status:${NC}"
            docker compose $cmd_args ps
            ;;
        *)
            echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
            exit 1
            ;;
    esac
}

# Main execution
echo -e "${BLUE}=== Sound Forge Alchemy Docker Setup ===${NC}"
echo -e "${YELLOW}Profile: ${GREEN}$PROFILE${NC}"
echo -e "${YELLOW}Action:  ${GREEN}$ACTION${NC}"
if [[ -n "$SERVICE" ]]; then
    echo -e "${YELLOW}Service: ${GREEN}$SERVICE${NC}"
fi
if [[ "$GPU_ENABLED" == true ]]; then
    echo -e "${YELLOW}GPU:     ${GREEN}Enabled${NC}"
fi
echo

# Setup environment and execute
setup_environment
execute_action

echo -e "${GREEN}Done!${NC}"