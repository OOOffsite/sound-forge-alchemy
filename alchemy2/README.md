# Sound Forge Alchemy 2.0

Optimized architecture for audio processing and stem separation.

## Architecture Overview

### Frontend (React/Vite)
- **Components**: 69 core components (vs 116 in v1)
- **State Management**: Zustand
- **API Client**: Axios + Supabase
- **Build Tool**: Vite

### Backend (Node.js + Express)
- **API**: Unified Express server
- **Workers**: Python process workers for audio processing
- **Database**: Supabase PostgreSQL
- **WebSocket**: Real-time progress updates

### Docker Architecture
- **12 Total Files** (vs 52 in v1)
- **Base Images**: node, python-node, frontend
- **Multi-stage Builds**: Optimized layer caching
- **Services**: Frontend, Backend, Supabase

## Directory Structure

```
alchemy2/
├── frontend/          # React/Vite frontend
├── backend/           # Node.js API + Python workers
├── docker/            # Docker configuration
├── supabase/          # Database migrations & functions
├── tests/             # E2E, integration, unit tests
└── docker-compose.yml # Service orchestration
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure Supabase credentials
3. Adjust worker thread counts
4. Set storage configurations

## Development Workflow

- **Frontend**: `npm run dev:frontend`
- **Backend**: `npm run dev:backend`
- **Docker**: `npm run dev` (full stack)

## Key Optimizations

1. **69 Components** instead of 116 (-40%)
2. **1 Backend Service** instead of 6 (-83%)
3. **12 Docker Files** instead of 52 (-77%)
4. **Unified API** with Python workers
5. **Optimized Build** with layer caching

## Architecture Documentation

See `/docs/architecture.md` for detailed specifications.

## License

MIT

---

Generated with Claude Code
