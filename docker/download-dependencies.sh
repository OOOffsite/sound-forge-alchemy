#!/bin/bash
# Script to download large dependencies for Sound Forge Alchemy
# These files will be stored locally and mapped to containers to avoid repeated downloads

set -e

# Create directories for dependencies
mkdir -p deps/{pytorch,demucs-models,spotdl-cache}
cd deps

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Downloading dependencies for Sound Forge Alchemy...${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists curl; then
  echo -e "${RED}Error: curl is required but not installed. Please install curl.${NC}"
  exit 1
fi

if ! command_exists python3; then
  echo -e "${RED}Error: python3 is required but not installed. Please install Python 3.${NC}"
  exit 1
fi

# Detect system type for appropriate PyTorch version
system_type="cpu"
platform="$(uname -s)"
machine="$(uname -m)"

if [[ "$platform" == "Darwin" ]]; then
  echo -e "${YELLOW}Detected macOS system${NC}"
  if [[ "$machine" == "arm64" ]]; then
    echo -e "${YELLOW}Apple Silicon detected, using MPS backend${NC}"
    system_type="mps"
  else
    echo -e "${YELLOW}Intel Mac detected, using CPU backend${NC}"
    system_type="cpu"
  fi
else
  # Check for NVIDIA GPU
  if command_exists nvidia-smi; then
    echo -e "${YELLOW}NVIDIA GPU detected, using CUDA backend${NC}"
    system_type="cuda"
  else
    echo -e "${YELLOW}No NVIDIA GPU detected, using CPU backend${NC}"
    system_type="cpu"
  fi
fi

# Create a virtual environment for dependency downloads
echo -e "${YELLOW}Creating Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install PyTorch based on system type
echo -e "${YELLOW}Installing PyTorch for $system_type...${NC}"
case $system_type in
  "cuda")
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    ;;
  "mps")
    pip install torch torchvision torchaudio
    ;;
  "cpu")
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    ;;
esac

# Download Demucs models
echo -e "${YELLOW}Downloading Demucs models...${NC}"
pip install demucs
python -c "import torch; from demucs.pretrained import get_model; model = get_model('htdemucs'); print(f'Downloaded model: {model}')"
python -c "import torch; from demucs.pretrained import get_model; model = get_model('htdemucs_ft'); print(f'Downloaded model: {model}')"

# Find the models directory and copy to our deps folder
models_dir=$(python -c "import demucs; import os; print(os.path.dirname(demucs.__file__))")
cp -r "$models_dir"/../models/* pytorch/
echo -e "${GREEN}Demucs models downloaded to deps/pytorch/${NC}"

# Install and configure spotdl for caching
echo -e "${YELLOW}Setting up spotdl cache...${NC}"
pip install spotdl
# Create a basic spotdl config file with cache settings
cat > spotdl-cache/.spotdl_config.json << EOF
{
  "cache_path": "./spotdl-cache",
  "audio_providers": ["youtube-music", "youtube"],
  "lyrics_providers": ["genius", "musixmatch"],
  "playlist_numbering": true,
  "scan_for_songs": false,
  "m3u": false,
  "output": "{artists} - {title}.{output-ext}",
  "overwrite": "skip",
  "client_id": "",
  "client_secret": "",
  "user_auth": false,
  "download_threads": 4,
  "cookies_file": null
}
EOF
echo -e "${GREEN}spotdl cache setup complete${NC}"

# Deactivate the virtual environment
deactivate

echo -e "${GREEN}All dependencies downloaded successfully!${NC}"
echo -e "${YELLOW}To use these dependencies with Docker, mount the deps directory as follows:${NC}"
echo -e "  - PyTorch/Demucs models: ${GREEN}-v \$(pwd)/deps/pytorch:/app/models${NC}"
echo -e "  - spotdl cache: ${GREEN}-v \$(pwd)/deps/spotdl-cache:/app/.spotdl-cache${NC}"

# Create a .env file with the dependency paths
cat > ../.env.deps << EOF
# Dependency paths for Docker
DEPS_DIR=\$(pwd)/deps
PYTORCH_MODELS_DIR=\${DEPS_DIR}/pytorch
SPOTDL_CACHE_DIR=\${DEPS_DIR}/spotdl-cache
EOF

echo -e "${GREEN}Created .env.deps file with dependency paths${NC}"
echo -e "${YELLOW}Load these environment variables with: source .env.deps${NC}"