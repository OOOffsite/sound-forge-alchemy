# Sound Forge Alchemy v2.0 - Migration Guide

**Version:** 1.0.0
**Date:** 2025-12-16
**Target:** Migrate from v1.0 (fragmented microservices) to v2.0 (unified architecture)

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Phase 1: Preparation](#phase-1-preparation)
3. [Phase 2: Backend Migration](#phase-2-backend-migration)
4. [Phase 3: Frontend Migration](#phase-3-frontend-migration)
5. [Phase 4: Infrastructure Migration](#phase-4-infrastructure-migration)
6. [Phase 5: Validation](#phase-5-validation)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Migration Checklist

### Prerequisites

- [ ] Docker 24+ installed
- [ ] Docker Compose 2+ installed
- [ ] Node.js 20 LTS installed
- [ ] Python 3.10+ installed
- [ ] Git repository clean (no uncommitted changes)
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] At least 20 GB free disk space
- [ ] Backup of existing audio data (if preserving)

### Environment Setup

```bash
# Verify tools
docker --version  # Should be 24+
docker-compose --version  # Should be 2+
node --version  # Should be v20+
python3 --version  # Should be 3.10+
supabase --version  # Should be latest

# Check disk space
df -h  # Ensure 20+ GB available
```

### Backup Current State

```bash
# Backup v1.0 configuration
cp .env .env.v1.0.backup
cp docker-compose.yml docker-compose.v1.0.backup.yml

# Backup audio data (if preserving)
docker-compose exec backend tar -czf /tmp/audio_data_backup.tar.gz /app/audio_data
docker cp sound-forge-backend-1:/tmp/audio_data_backup.tar.gz ./audio_data_backup.tar.gz

# Backup Redis data (if preserving)
docker-compose exec redis redis-cli SAVE
docker cp sound-forge-redis-1:/data/dump.rdb ./redis_backup.rdb

# Create git tag
git tag -a v1.0-pre-migration -m "State before v2.0 migration"
git push --tags
```

---

## Phase 1: Preparation

### Step 1.1: Create alchemy2 Directory Structure

```bash
# Create main directories
mkdir -p alchemy2/{frontend,backend,supabase,docker,e2e,docs}

# Frontend structure
mkdir -p alchemy2/frontend/{src,public}
mkdir -p alchemy2/frontend/src/{components,pages,lib,layouts,types,ui}

# Backend structure
mkdir -p alchemy2/backend/{src,python}
mkdir -p alchemy2/backend/src/{routes,services,workers,middleware,lib,types,__tests__}

# Supabase structure
mkdir -p alchemy2/supabase/{migrations,seed,functions}

# Docker structure
mkdir -p alchemy2/docker/{base,services,config}
```

**Validation:**
```bash
tree -L 3 alchemy2/  # Should show directory structure
```

### Step 1.2: Set Up Supabase Project

```bash
cd alchemy2/supabase

# Initialize Supabase (local development)
supabase init

# Start Supabase services
supabase start

# Note the credentials (save these!)
# API URL: http://localhost:54321
# anon key: <save-this-key>
# service_role key: <save-this-key>
```

**Validation:**
```bash
supabase status  # Should show all services running
```

### Step 1.3: Create Database Schema

Create `alchemy2/supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tracks table
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_url TEXT UNIQUE,
  spotify_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  album_art TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Download jobs
CREATE TABLE download_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  output_path TEXT,
  file_size BIGINT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Processing jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  download_job_id UUID REFERENCES download_jobs(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  model TEXT DEFAULT 'htdemucs',
  options JSONB DEFAULT '{}',
  output_paths JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analysis jobs
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  processing_job_id UUID REFERENCES processing_jobs(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  results JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track settings
CREATE TABLE track_settings (
  track_id UUID PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  auto_process BOOLEAN DEFAULT false,
  auto_analyze BOOLEAN DEFAULT false,
  separation_options JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_download_jobs_track_id ON download_jobs(track_id);
CREATE INDEX idx_download_jobs_status ON download_jobs(status);
CREATE INDEX idx_processing_jobs_track_id ON processing_jobs(track_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_analysis_jobs_track_id ON analysis_jobs(track_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_download_jobs_updated_at BEFORE UPDATE ON download_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON analysis_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Apply migration:
```bash
supabase db reset  # Applies all migrations
```

**Validation:**
```bash
# Check tables created
supabase db dump --schema public

# Should show all 5 tables with indexes
```

### Step 1.4: Configure Realtime

Create `alchemy2/supabase/migrations/002_realtime_config.sql`:

```sql
-- Enable Realtime for job tables
ALTER PUBLICATION supabase_realtime ADD TABLE download_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;
```

Apply:
```bash
supabase db reset
```

### Step 1.5: Create Docker Base Images

Create `alchemy2/docker/base/Dockerfile.node-base`:

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache tini curl
WORKDIR /app

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production

FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .

FROM dependencies AS production
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

Build base images:
```bash
# Node base
docker build -t sound-forge-node-base:latest \
  -f alchemy2/docker/base/Dockerfile.node-base .

# Verify
docker images | grep sound-forge-node-base
```

---

## Phase 2: Backend Migration

### Step 2.1: Copy Backend Files

```bash
# Copy shared utilities
mkdir -p alchemy2/backend/src/lib
# Note: Will create new files rather than copying old Redis-dependent code

# Copy Python scripts (will be refactored)
cp backend/analysis/src/analyzer.py alchemy2/backend/python/analyzer.py
cp backend/processing/python/requirements.txt alchemy2/backend/python/requirements.txt
```

### Step 2.2: Create Unified Express App

Create `alchemy2/backend/package.json`:

```json
{
  "name": "sound-forge-backend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "winston": "^3.11.0",
    "joi": "^17.11.0",
    "socket.io": "^4.6.1",
    "spotify-web-api-node": "^5.0.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "jest": "^29.7.0"
  }
}
```

Create `alchemy2/backend/src/index.ts`:

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';

// Import routes
import spotifyRouter from './routes/spotify';
import downloadRouter from './routes/download';
import processingRouter from './routes/processing';
import analysisRouter from './routes/analysis';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/spotify', spotifyRouter);
app.use('/api/download', downloadRouter);
app.use('/api/processing', processingRouter);
app.use('/api/analysis', analysisRouter);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`Unified backend listening on port ${PORT}`);
});
```

**Install dependencies:**
```bash
cd alchemy2/backend
npm install
```

### Step 2.3: Create Supabase Client Library

Create `alchemy2/backend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions
export async function updateJobStatus(
  table: string,
  jobId: string,
  status: string,
  progress: number,
  error?: string
) {
  const { data, error: dbError } = await supabase
    .from(table)
    .update({ status, progress, error, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
}
```

### Step 2.4: Migrate Service Routes

**Example: Spotify Routes**

Create `alchemy2/backend/src/routes/spotify.ts`:

```typescript
import { Router } from 'express';
import { spotifyService } from '../services/spotify.service';

const router = Router();

router.post('/fetch', async (req, res, next) => {
  try {
    const { url } = req.body;
    const metadata = await spotifyService.fetchMetadata(url);
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Repeat for:**
- `download.ts`
- `processing.ts`
- `analysis.ts`

### Step 2.5: Test Backend

```bash
cd alchemy2/backend

# Start dev server
npm run dev

# Test health check
curl http://localhost:3000/health

# Test endpoints
curl -X POST http://localhost:3000/api/spotify/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://open.spotify.com/track/..."}'
```

---

## Phase 3: Frontend Migration

### Step 3.1: Copy Frontend Files

```bash
# Copy existing frontend
cp -r src/ alchemy2/frontend/src/
cp -r public/ alchemy2/frontend/public/
cp package.json alchemy2/frontend/
cp vite.config.ts alchemy2/frontend/
cp tsconfig.json alchemy2/frontend/
```

### Step 3.2: Remove Unused Components

```bash
cd alchemy2/frontend/src/components/ui

# Remove 47 unused components
rm accordion.tsx alert-dialog.tsx alert.tsx aspect-ratio.tsx \
   avatar.tsx badge.tsx breadcrumb.tsx calendar.tsx card.tsx \
   carousel.tsx chart.tsx checkbox.tsx collapsible.tsx command.tsx \
   context-menu.tsx drawer.tsx dropdown-menu.tsx form.tsx \
   hover-card.tsx input-otp.tsx menubar.tsx navigation-menu.tsx \
   pagination.tsx popover.tsx progress.tsx radio-group.tsx \
   resizable.tsx scroll-area.tsx select.tsx separator.tsx \
   sheet.tsx sidebar.tsx skeleton.tsx slider.tsx switch.tsx \
   table.tsx tabs.tsx textarea.tsx toggle-group.tsx tooltip.tsx
```

### Step 3.3: Remove Unused Dependencies

```bash
cd alchemy2/frontend

# Remove 22 Radix packages
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip

# Remove heavy dependencies
npm uninstall recharts react-day-picker date-fns cmdk \
  embla-carousel-react vaul input-otp
```

### Step 3.4: Update API Client

Edit `alchemy2/frontend/src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Update all API calls to use /api/* routes
export async function fetchSpotifyMetadata(url: string) {
  const response = await fetch(`${API_BASE_URL}/api/spotify/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return response.json();
}

// Repeat for all API functions
```

### Step 3.5: Configure Supabase Realtime

Create `alchemy2/frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Subscribe to job updates
export function subscribeToJobUpdates(trackId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`job-updates-${trackId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'download_jobs',
      filter: `track_id=eq.${trackId}`
    }, callback)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'processing_jobs',
      filter: `track_id=eq.${trackId}`
    }, callback)
    .subscribe();
}
```

### Step 3.6: Test Frontend

```bash
cd alchemy2/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
open http://localhost:5173

# Verify:
# - UI loads correctly
# - Components render
# - API calls work
# - Realtime updates work
```

---

## Phase 4: Infrastructure Migration

### Step 4.1: Build Docker Images

```bash
cd alchemy2

# Build backend image
docker build -t sound-forge-backend:latest \
  -f docker/services/Dockerfile.backend backend/

# Build frontend image
docker build -t sound-forge-frontend:latest \
  -f docker/services/Dockerfile.frontend frontend/

# Verify images
docker images | grep sound-forge
```

### Step 4.2: Create docker-compose Configuration

Create `alchemy2/docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: sound-forge-backend:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID}
      SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET}
    volumes:
      - audio_data:/app/audio_data
    networks:
      - sound-forge-internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: sound-forge-frontend:latest
    ports:
      - "8001:80"
    depends_on:
      - backend
    networks:
      - sound-forge-external

networks:
  sound-forge-external:
  sound-forge-internal:

volumes:
  audio_data:
```

### Step 4.3: Start Services

```bash
cd alchemy2

# Create .env file
cat > .env << ENV_EOF
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<your-service-role-key>
SPOTIFY_CLIENT_ID=<your-client-id>
SPOTIFY_CLIENT_SECRET=<your-client-secret>
ENV_EOF

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Check logs
docker-compose logs -f
```

**Validation:**
```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:8001

# Should return 200 OK
```

### Step 4.4: Decommission v1.0 Services

```bash
# Stop v1.0 services
docker-compose -f docker-compose.v1.0.backup.yml down

# Remove old volumes (optional - backup first!)
docker volume ls | grep sound-forge
docker volume prune -f
```

---

## Phase 5: Validation

### Step 5.1: Smoke Tests

```bash
cd alchemy2

# Test full workflow
curl -X POST http://localhost:3000/api/spotify/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp"}'

# Expected: JSON metadata response
```

### Step 5.2: Performance Testing

```bash
# Bundle size check
cd alchemy2/frontend
npm run build

# Check dist/ size
du -sh dist/
# Should be <720 KB total

# Lighthouse test
npx lighthouse http://localhost:8001 --view
# Performance should be >90
```

### Step 5.3: End-to-End Testing

Run through complete user workflows:

1. Search for track
2. Download audio
3. Separate stems
4. Analyze audio
5. Export stems

Verify:
- Real-time progress updates
- Job status persistence
- Error handling
- File downloads

---

## Rollback Procedures

### Emergency Rollback (< 1 hour after migration)

```bash
# Stop v2.0 services
cd alchemy2
docker-compose down

# Restore v1.0 services
cd ..
docker-compose -f docker-compose.v1.0.backup.yml up -d

# Restore environment
cp .env.v1.0.backup .env

# Restore audio data (if needed)
docker cp audio_data_backup.tar.gz sound-forge-backend-1:/tmp/
docker-compose exec backend tar -xzf /tmp/audio_data_backup.tar.gz -C /

# Restore Redis data (if needed)
docker cp redis_backup.rdb sound-forge-redis-1:/data/dump.rdb
docker-compose restart redis

# Verify
curl http://localhost:3000/health
```

### Partial Rollback (specific service)

```bash
# If only backend is problematic, keep frontend
docker-compose stop backend
docker-compose -f ../docker-compose.v1.0.backup.yml up -d backend

# Update frontend API URL to point to v1.0 backend
```

---

## Troubleshooting

### Issue: Supabase Connection Failed

**Symptoms:**
- Backend logs show "Connection refused" or "ECONNREFUSED"
- API returns 500 errors

**Solution:**
```bash
# Check Supabase is running
supabase status

# If not running, start it
supabase start

# Verify connection
psql postgres://postgres:postgres@localhost:54322/postgres
```

### Issue: Docker Images Too Large

**Symptoms:**
- Backend image >500 MB
- Build takes >10 minutes

**Solution:**
```bash
# Use multi-stage builds more effectively
# Clean up build artifacts
docker system prune -a

# Rebuild with --no-cache
docker build --no-cache -t sound-forge-backend:latest backend/
```

### Issue: Frontend Bundle Size Still Large

**Symptoms:**
- Bundle >720 KB after optimization

**Solution:**
```bash
# Analyze bundle
cd alchemy2/frontend
npm run build -- --analyze

# Check for:
# - Large dependencies not tree-shaken
# - Duplicate code
# - Unused exports

# Re-verify removals
npm ls | grep radix  # Should only show 5 packages
```

### Issue: Real-time Updates Not Working

**Symptoms:**
- Job progress not updating in UI
- No WebSocket connection

**Solution:**
```bash
# Check Supabase Realtime
supabase status | grep Realtime
# Should show running

# Check table publication
psql postgres://postgres:postgres@localhost:54322/postgres
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
# Should show download_jobs, processing_jobs, analysis_jobs

# Check frontend console for errors
# Should see WebSocket connection established
```

---

## Post-Migration Checklist

- [ ] All v1.0 services stopped
- [ ] All v2.0 services running and healthy
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Audio data migrated (if applicable)
- [ ] API endpoints functional
- [ ] Real-time updates working
- [ ] Frontend loads correctly
- [ ] Bundle size meets target (<720 KB)
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Team trained on new architecture
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Git tag created: `v2.0-production`

---

## Success Criteria

Migration is considered successful when:

1. **Backend**: All 23 API endpoints functional, no Redis dependencies
2. **Frontend**: Bundle size <720 KB, no circular dependencies, build succeeds
3. **Infrastructure**: 2 containers running, health checks passing
4. **Performance**: Meets or exceeds v1.0 benchmarks
5. **Testing**: >80% code coverage, all critical workflows tested
6. **Documentation**: Complete and accurate

---

## Next Steps After Migration

1. Monitor production for 1 week
2. Gather user feedback
3. Optimize based on real-world usage
4. Plan v2.1 enhancements
5. Decommission v1.0 codebase permanently

---

**END OF MIGRATION GUIDE**
