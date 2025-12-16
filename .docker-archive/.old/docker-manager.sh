#!/bin/bash
# Utility script to manage Docker containers for Sound Forge Alchemy

set -e

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENV="dev"
ACTION="up"
DOCKER_COMPOSE="docker-compose"
PLATFORM_COMPOSE="docker/compose-files/docker-compose-platform.yml"
BASE_COMPOSE="docker/compose-files/docker-compose.yml"

# Function to display help
show_help() {
    echo -e "${BLUE}Sound Forge Alchemy Docker Manager${NC}"
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -e, --env <env>      Environment (dev, mac, prod) [default: dev]"
    echo "  -a, --action <action> Action (up, down, restart, logs, build) [default: up]"
    echo "  -g, --gpu            Enable GPU support (only valid with prod environment)"
    echo "  -d, --deps           Download dependencies first"
    echo "  -p, --platform-only  Only manage platform services"
    echo "  -s, --service <name> Target specific service"
    echo "  -h, --help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0 -e dev -a up              # Start development environment"
    echo "  $0 -e mac -a up              # Start macOS environment"
    echo "  $0 -e prod -a up -g          # Start production environment with GPU"
    echo "  $0 -a down                   # Stop development environment"
    echo "  $0 -e prod -a logs -s redis  # View logs for Redis in production environment"
    echo "  $0 -p -a up                  # Start only platform services"
    echo "  $0 -d                        # Download dependencies and start dev environment"
    echo
}

# Parse command line arguments
PLATFORM_ONLY=false
DOWNLOAD_DEPS=false
USE_GPU=false
SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -g|--gpu)
            USE_GPU=true
            shift
            ;;
        -d|--deps)
            DOWNLOAD_DEPS=true
            shift
            ;;
        -p|--platform-only)
            PLATFORM_ONLY=true
            shift
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "mac" && "$ENV" != "prod" ]]; then
    echo -e "${RED}Error: Invalid environment '$ENV'. Must be 'dev', 'mac', or 'prod'.${NC}"
    exit 1
fi

# Validate action
if [[ "$ACTION" != "up" && "$ACTION" != "down" && "$ACTION" != "restart" && "$ACTION" != "logs" && "$ACTION" != "build" ]]; then
    echo -e "${RED}Error: Invalid action '$ACTION'. Must be 'up', 'down', 'restart', 'logs', or 'build'.${NC}"
    exit 1
fi

# Set environment-specific compose file
if [[ "$ENV" == "dev" ]]; then
    ENV_COMPOSE="docker/compose-files/docker-compose.dev.yml"
elif [[ "$ENV" == "mac" ]]; then
    ENV_COMPOSE="docker/compose-files/docker-compose.mac.yml"
else
    ENV_COMPOSE="docker/compose-files/docker-compose.prod.yml"
fi

# Download dependencies if requested
if [[ "$DOWNLOAD_DEPS" == true ]]; then
    echo -e "${YELLOW}Downloading dependencies...${NC}"
    chmod +x docker/download-dependencies.sh
    ./docker/download-dependencies.sh
    
    # Source dependency environment variables
    if [[ -f .env.deps ]]; then
        echo -e "${GREEN}Loading dependency environment variables...${NC}"
        source .env.deps
    fi
fi

# Load environment variables
if [[ -f .env.docker ]]; then
    echo -e "${GREEN}Loading environment variables from .env.docker...${NC}"
    source .env.docker
fi

# Create required networks
create_networks() {
    echo -e "${YELLOW}Creating Docker networks...${NC}"
    
    # Create networks if they don't exist
    if [[ "$ENV" == "prod" ]]; then
        docker network inspect sound-forge-frontend-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-frontend-network
        docker network inspect sound-forge-api-gateway-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-api-gateway-network
        docker network inspect sound-forge-service-mesh-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-service-mesh-network
        docker network inspect sound-forge-data-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-data-network
        docker network inspect sound-forge-websocket-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-websocket-network
        docker network inspect sound-forge-monitoring-network >/dev/null 2>&1 || \
            docker network create --driver overlay sound-forge-monitoring-network
    else
        docker network inspect sound-forge-frontend-network >/dev/null 2>&1 || \
            docker network create sound-forge-frontend-network
        docker network inspect sound-forge-api-gateway-network >/dev/null 2>&1 || \
            docker network create sound-forge-api-gateway-network
        docker network inspect sound-forge-service-mesh-network >/dev/null 2>&1 || \
            docker network create sound-forge-service-mesh-network
        docker network inspect sound-forge-data-network >/dev/null 2>&1 || \
            docker network create sound-forge-data-network
        docker network inspect sound-forge-websocket-network >/dev/null 2>&1 || \
            docker network create sound-forge-websocket-network
        docker network inspect sound-forge-monitoring-network >/dev/null 2>&1 || \
            docker network create sound-forge-monitoring-network
    fi
}

# Set GPU variables if needed
if [[ "$USE_GPU" == true && "$ENV" == "prod" ]]; then
    echo -e "${YELLOW}Enabling GPU support...${NC}"
    export USE_GPU=true
    export GPU_DRIVER=nvidia
    export GPU_COUNT=1
    export GPU_CAPABILITIES=gpu
fi

# Perform action on platform services
platform_action() {
    echo -e "${YELLOW}Performing '$ACTION' on platform services...${NC}"
    
    if [[ "$ACTION" == "up" ]]; then
        $DOCKER_COMPOSE -f $PLATFORM_COMPOSE up -d --build
    elif [[ "$ACTION" == "down" ]]; then
        $DOCKER_COMPOSE -f $PLATFORM_COMPOSE down
    elif [[ "$ACTION" == "restart" ]]; then
        $DOCKER_COMPOSE -f $PLATFORM_COMPOSE restart $SERVICE
    elif [[ "$ACTION" == "logs" ]]; then
        $DOCKER_COMPOSE -f $PLATFORM_COMPOSE logs -f $SERVICE
    elif [[ "$ACTION" == "build" ]]; then
        $DOCKER_COMPOSE -f $PLATFORM_COMPOSE build $SERVICE
    fi
}

# Perform action on application services
app_action() {
    echo -e "${YELLOW}Performing '$ACTION' on application services for $ENV environment...${NC}"
    
    if [[ "$ACTION" == "up" ]]; then
        $DOCKER_COMPOSE -f $BASE_COMPOSE -f $ENV_COMPOSE up -d --build
    elif [[ "$ACTION" == "down" ]]; then
        $DOCKER_COMPOSE -f $BASE_COMPOSE -f $ENV_COMPOSE down
    elif [[ "$ACTION" == "restart" ]]; then
        $DOCKER_COMPOSE -f $BASE_COMPOSE -f $ENV_COMPOSE restart $SERVICE
    elif [[ "$ACTION" == "logs" ]]; then
        $DOCKER_COMPOSE -f $BASE_COMPOSE -f $ENV_COMPOSE logs -f $SERVICE
    elif [[ "$ACTION" == "build" ]]; then
        $DOCKER_COMPOSE -f $BASE_COMPOSE -f $ENV_COMPOSE build $SERVICE
    fi
}

# Main execution
echo -e "${BLUE}=== Sound Forge Alchemy Docker Manager ===${NC}"
echo -e "${YELLOW}Environment: ${GREEN}$ENV${NC}"
echo -e "${YELLOW}Action: ${GREEN}$ACTION${NC}"
if [[ "$SERVICE" != "" ]]; then
    echo -e "${YELLOW}Service: ${GREEN}$SERVICE${NC}"
fi
if [[ "$USE_GPU" == true ]]; then
    echo -e "${YELLOW}GPU: ${GREEN}Enabled${NC}"
fi
echo

# Only create networks for 'up' action
if [[ "$ACTION" == "up" ]]; then
    create_networks
fi

# Always run platform services first
platform_action

# Run application services if not platform-only
if [[ "$PLATFORM_ONLY" == false ]]; then
    app_action
fi

echo -e "${GREEN}Done!${NC}"