# Sound Forge Alchemy - Supabase Setup Guide

**Version**: 1.0.0
**Date**: 2025-12-16
**Purpose**: Replace Redis + PostgreSQL with Supabase

---

## Overview

This Supabase setup replaces the previous architecture:

| Component | Before | After |
|-----------|--------|-------|
| **Job Storage** | Redis (volatile) | PostgreSQL (persistent) |
| **Real-time Updates** | Redis Pub/Sub | Supabase Realtime |
| **File Storage** | Docker volumes | Supabase Storage buckets |
| **Database** | Separate PostgreSQL | Supabase PostgreSQL |

---

## Quick Start

### Option 1: Local Development (Recommended)

#### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Supabase CLI installed

#### Install Supabase CLI
```bash
npm install -g supabase
# OR
brew install supabase/tap/supabase
```

#### Start Local Supabase
```bash
cd /Users/jeremiah/Developer/sound-forge-alchemy/alchemy2

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase (Docker containers)
supabase start
```

**Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Copy Keys to .env
```bash
# Copy .env.example to .env
cp .env.example .env

# Update .env with the keys from `supabase start` output
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=<anon key from output>
# SUPABASE_SERVICE_ROLE_KEY=<service_role key from output>
```

#### Run Migrations
```bash
# Apply database schema
supabase db push

# OR manually via psql
supabase db reset
```

#### Verify Setup
```bash
# Open Supabase Studio in browser
open http://localhost:54323

# Check tables exist
supabase db inspect
```

---

### Option 2: Supabase Cloud (Production)

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: sound-forge-alchemy
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to users
4. Wait ~2 minutes for provisioning

#### 2. Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

#### 3. Update .env
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4. Run Migrations
```bash
# Link to cloud project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

---

## Database Schema

### Tables

#### 1. **tracks** - Spotify track metadata
```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY,
  spotify_id TEXT UNIQUE,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  album_art_url TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. **download_jobs** - Audio download queue (spotdl)
```sql
CREATE TABLE download_jobs (
  id UUID PRIMARY KEY,
  track_id UUID REFERENCES tracks(id),
  status TEXT, -- queued, processing, completed, error
  progress INTEGER, -- 0-100
  output_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 3. **processing_jobs** - Stem separation queue (Demucs)
```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY,
  track_id UUID REFERENCES tracks(id),
  model TEXT DEFAULT 'htdemucs',
  status TEXT,
  progress INTEGER,
  output_path TEXT,
  options JSONB,
  error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 4. **analysis_jobs** - Audio analysis queue (librosa)
```sql
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY,
  track_id UUID REFERENCES tracks(id),
  status TEXT,
  progress INTEGER,
  results JSONB,
  error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 5. **stems** - Separated audio files
```sql
CREATE TABLE stems (
  id UUID PRIMARY KEY,
  processing_job_id UUID REFERENCES processing_jobs(id),
  track_id UUID REFERENCES tracks(id),
  stem_type TEXT, -- vocals, drums, bass, other
  file_path TEXT,
  storage_url TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ
);
```

#### 6. **analysis_results** - Detailed analysis data
```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY,
  track_id UUID REFERENCES tracks(id),
  analysis_job_id UUID REFERENCES analysis_jobs(id),
  tempo FLOAT,
  key TEXT,
  energy FLOAT,
  features JSONB,
  created_at TIMESTAMPTZ
);
```

---

## Storage Buckets

### Setup Buckets

#### Via Supabase Studio (UI)
1. Open http://localhost:54323 (or cloud dashboard)
2. Go to **Storage**
3. Click **New Bucket**
4. Create:
   - **Name**: `audio-files`
   - **Public**: No (private)
   - **File size limit**: 50MB
   - **Allowed MIME types**: `audio/mpeg, audio/wav, audio/flac, audio/ogg`
5. Repeat for `stems` bucket

#### Via SQL
```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('audio-files', 'audio-files', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg']),
  ('stems', 'stems', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/flac']);

-- Create storage policies
CREATE POLICY "Allow authenticated uploads to audio-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Allow authenticated uploads to stems"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stems');
```

---

## Realtime Subscriptions

Replace WebSocket service with Supabase Realtime.

### Frontend Example (JavaScript)
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Subscribe to job updates
const channel = supabase
  .channel('job_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'download_jobs',
    filter: `track_id=eq.${trackId}`
  }, (payload) => {
    console.log('Job updated:', payload.new)
    // Update UI with new progress
  })
  .subscribe()

// Cleanup
channel.unsubscribe()
```

### Backend Example (Node.js)
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Update job progress
async function updateJobProgress(jobId, progress) {
  const { data, error } = await supabase
    .from('download_jobs')
    .update({ progress, updated_at: new Date() })
    .eq('id', jobId)

  // Realtime automatically broadcasts to subscribers
  return { data, error }
}
```

---

## Migration from Redis

### Redis → PostgreSQL Mapping

| Redis Key | Supabase Table | Notes |
|-----------|----------------|-------|
| `job:download:{id}` | `download_jobs` row | Persistent, queryable |
| `job:processing:{id}` | `processing_jobs` row | Persistent, queryable |
| `job:analysis:{id}` | `analysis_jobs` row | Persistent, queryable |
| `track:{id}` | `tracks` row | Persistent, relational |
| Redis Pub/Sub | Supabase Realtime | Automatic on table updates |

### Benefits
- ✅ **Persistent storage**: No TTL, no data loss on restart
- ✅ **SQL queries**: Filter, sort, aggregate jobs
- ✅ **Automatic backups**: Point-in-time recovery
- ✅ **Realtime**: Built-in WebSocket subscriptions
- ✅ **Storage**: CDN-backed file serving
- ✅ **Auth**: Built-in RLS for security (when needed)

---

## Testing

### Verify Database
```bash
# Connect to local database
supabase db reset

# Run SQL query
supabase db query "SELECT * FROM tracks LIMIT 10;"

# Check table sizes
supabase db inspect table-sizes
```

### Test Realtime
```bash
# In one terminal: watch for changes
supabase db listen postgres_changes --event=UPDATE --schema=public --table=download_jobs

# In another terminal: make an update
supabase db query "UPDATE download_jobs SET progress = 50 WHERE id = '...';"
```

### Test Storage
```bash
# Upload file via CLI
curl -X POST http://localhost:54321/storage/v1/object/audio-files/test.mp3 \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -F file=@test.mp3

# List files
supabase storage ls audio-files
```

---

## Troubleshooting

### Issue: Migrations fail
```bash
# Reset database completely
supabase db reset

# Re-run migrations
supabase db push
```

### Issue: Realtime not working
1. Check `config.toml` has `realtime.enabled = true`
2. Verify tables added to publication:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE download_jobs;
   ```
3. Restart Supabase:
   ```bash
   supabase stop
   supabase start
   ```

### Issue: Storage uploads fail
1. Check bucket exists: `supabase storage ls`
2. Verify MIME types allowed in `config.toml`
3. Check file size limits (default: 50MB)

### Issue: Can't connect to database
```bash
# Check Docker containers running
docker ps | grep supabase

# Restart Supabase
supabase stop
supabase start
```

---

## CLI Commands Reference

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View status
supabase status

# Reset database (destructive!)
supabase db reset

# Apply migrations
supabase db push

# Create new migration
supabase migration new migration_name

# Link to cloud project
supabase link --project-ref your-project-id

# Deploy to cloud
supabase db push

# View logs
supabase logs

# Open Studio UI
open http://localhost:54323
```

---

## Next Steps

1. ✅ Run `supabase start` locally
2. ✅ Apply migrations with `supabase db push`
3. ✅ Create storage buckets in Studio
4. ✅ Update `.env` with API keys
5. 🔄 Update backend to use Supabase client
6. 🔄 Replace Redis calls with Supabase queries
7. 🔄 Update frontend to use Realtime subscriptions
8. 🔄 Test end-to-end workflow

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Maintained by**: Backend Consolidation Team
**Last Updated**: 2025-12-16
**Version**: 1.0.0
