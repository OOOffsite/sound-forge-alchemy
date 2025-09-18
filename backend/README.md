# Sound Forge Alchemy - Backend

Sound Forge Alchemy is a web application for audio source separation, allowing users to split music tracks into individual stems (vocals, drums, bass, other), and perform audio analysis.

## Architecture

The backend is built as a microservices architecture with the following components:

1. **api-gateway** - Entry point for all client requests, routes to appropriate services
2. **spotify** - Handles Spotify API interactions
3. **download** - Handles downloading tracks with `spotdl`
4. **processing** - Handles audio separation with `demucs`
5. **analysis** - Handles audio analysis (BPM, key detection, etc.)
6. **websocket** - Handles real-time communication with clients (TypeScript)
7. **Redis** - For caching, pub/sub messaging between services
8. **PostgreSQL** - Database for storing metadata
9. **Supabase** - For authentication, storage, and database access

## Standardized Service Structure

Each service follows a consistent directory structure:

```
service-name/
├── src/                    # Source code
│   ├── index.js|ts        # Main entry point
│   ├── logging.js         # Service logging configuration
│   └── ...                # Other source files
├── tests/                 # Test files
│   ├── setup.ts          # Test setup and mocks
│   └── ...               # Test files (.test.js|ts, .spec.js|ts)
├── config/               # Service-specific configuration
├── package.json          # Dependencies and scripts
├── jest.config.js        # Jest configuration (extends base)
├── nodemon.json          # Nodemon configuration (extends base)
├── tsconfig.json         # TypeScript configuration (if TS service)
├── Dockerfile            # Docker configuration
└── requirements.txt      # Python dependencies (if applicable)
```

### Shared Configuration

The backend includes shared configuration files that all services extend:

- `/backend/tsconfig.json` - Base TypeScript configuration
- `/backend/.eslintrc.js` - ESLint configuration with TypeScript support
- `/backend/.prettierrc` - Code formatting configuration
- `/backend/jest.config.js` - Base Jest testing configuration
- `/backend/nodemon.json` - Base nodemon development configuration

### Package.json Scripts

All services have standardized npm scripts:

- `start` - Production start command
- `dev` - Development mode with hot reload
- `build` - Build command (TypeScript compilation or no-op for JS)
- `test` - Run tests
- `test:watch` - Run tests in watch mode
- `test:coverage` - Run tests with coverage report
- `lint` - Lint code
- `lint:fix` - Lint and auto-fix code
- `format` - Format code with Prettier
- `format:check` - Check code formatting

### Technology Stack

- **JavaScript Services**: api-gateway, spotify, download, processing, analysis
- **TypeScript Service**: websocket (with full TypeScript configuration)
- **Testing**: Jest with service-specific setup files
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Development**: Nodemon with hot reload

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Be sure to update the Spotify API credentials.

### Running with Docker

To start all services:

```bash
docker-compose up
```

To build and start all services:

```bash
docker-compose up --build
```

To start specific services:

```bash
docker-compose up api-gateway spotify
```

Note: Docker service names in docker-compose.yml may need to be updated to match the new directory structure.

### Development

For local development, you can run each service individually:

```bash
# API Gateway
cd backend/api-gateway
npm install
npm run dev

# Spotify Service
cd backend/spotify
npm install
npm run dev

# Download Service
cd backend/download
npm install
pip install -r requirements.txt
npm run dev

# Processing Service
cd backend/processing
npm install
pip install -r requirements.txt
npm run dev

# Analysis Service
cd backend/analysis
npm install
pip install -r requirements.txt
npm run dev

# WebSocket Service (TypeScript)
cd backend/websocket
npm install
npm run dev
```

### Development Scripts

Each service supports the following development commands:

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check code formatting
npm run format:check

# Build (TypeScript services only)
npm run build
```

### Shared Development Workflow

The backend uses shared configuration files to maintain consistency across all services:

1. **Code Style**: All services use the same ESLint and Prettier configurations
2. **Testing**: Jest configuration is shared with service-specific overrides
3. **TypeScript**: Base TypeScript configuration is extended by TypeScript services
4. **Development**: Nodemon configuration is shared for hot reload functionality

To set up a new service:

1. Create the service directory with the standardized structure
2. Copy package.json from an existing service and update the name/description
3. Create service-specific configurations that extend the shared ones
4. Add test setup files with appropriate mocks
5. Update Docker configurations and docker-compose.yml

### Migration from Old Structure

The services have been renamed and restructured:
- `analysis-service` → `analysis`
- `download-service` → `download`
- `processing-service` → `processing`
- `spotify-service` → `spotify`
- `websocket-service` → `websocket`
- `api-gateway` remains unchanged

All source files have been moved to `src/` directories, and test configurations have been standardized.

## API Documentation

### API Gateway

- `GET /health` - Health check endpoint
- `GET /api/config` - Get Supabase configuration

### Spotify Service

- `POST /api/spotify/fetch` - Fetch playlist/album/track details
  - Body: `{ "url": "spotify-url" }`

### Download Service

- `POST /api/download/track` - Download a track
  - Body: `{ "trackId": "id", "spotifyUrl": "url" }`
- `GET /api/download/job/:jobId` - Get download job status
- `GET /api/download/track/:trackId` - Get track download status

### Processing Service

- `POST /api/process/separate` - Separate a track into stems
  - Body: `{ "trackId": "id", "options": { "model": "htdemucs", "extractVocals": true, ... } }`
- `GET /api/process/job/:jobId` - Get processing job status
- `GET /api/process/track/:trackId` - Get track processing status and stems

### Analysis Service

- `POST /api/analyze/analyze` - Analyze a track
  - Body: `{ "trackId": "id" }`
- `GET /api/analyze/job/:jobId` - Get analysis job status
- `GET /api/analyze/track/:trackId` - Get track analysis results

### WebSocket Service

- `ws://` - WebSocket connection
  - Events:
    - `subscribe:track` - Subscribe to track events (client -> server)
    - `unsubscribe:track` - Unsubscribe from track events (client -> server)
    - `download:job:*` - Download job events (server -> client)
    - `processing:job:*` - Processing job events (server -> client)
    - `analysis:job:*` - Analysis job events (server -> client)

## License

MIT