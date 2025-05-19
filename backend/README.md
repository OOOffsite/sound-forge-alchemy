# Sound Forge Alchemy - Backend

Sound Forge Alchemy is a web application for audio source separation, allowing users to split music tracks into individual stems (vocals, drums, bass, other), and perform audio analysis.

## Architecture

The backend is built as a microservices architecture with the following components:

1. **API Gateway** - Entry point for all client requests, routes to appropriate services
2. **Spotify Service** - Handles Spotify API interactions
3. **Download Service** - Handles downloading tracks with `spotdl`
4. **Processing Service** - Handles audio separation with `demucs`
5. **Analysis Service** - Handles audio analysis (BPM, key detection, etc.)
6. **WebSocket Service** - Handles real-time communication with clients
7. **Redis** - For caching, pub/sub messaging between services
8. **PostgreSQL** - Database for storing metadata
9. **Supabase** - For authentication, storage, and database access

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
docker-compose up api-gateway spotify-service
```

### Development

For local development, you can run each service individually:

```bash
# API Gateway
cd backend/api-gateway
npm install
npm run dev

# Spotify Service
cd backend/spotify-service
npm install
npm run dev

# Download Service
cd backend/download-service
npm install
pip install -r requirements.txt
npm run dev

# Processing Service
cd backend/processing-service
npm install
pip install -r requirements.txt
npm run dev

# Analysis Service
cd backend/analysis-service
npm install
pip install -r requirements.txt
npm run dev

# WebSocket Service
cd backend/websocket-service
npm install
npm run dev
```

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