# Sound Forge Alchemy Infrastructure Analysis Summary

**Analysis Date:** 2025-12-16  
**Agent:** Infrastructure Analysis Agent  
**Status:** ✅ Complete

---

## Executive Summary

**Current State:** 81 Docker files, Redis-based pub/sub and job storage, minimal Supabase integration  
**Target State:** 12 Docker files (85% reduction), Supabase-based infrastructure, 3 fewer containers  
**Feasibility:** HIGH - Straightforward migration path with significant benefits

---

## Current Infrastructure Problems

### 1. Docker File Sprawl (81 files!)
- 9 docker-compose files (should be 2)
- 12 base image Dockerfiles (should be 3)
- 38+ duplicate/variant Dockerfiles
- 8 old/backup files still in repo
- Service Dockerfiles scattered across 4 directories

### 2. Redis Over-Engineering
**Usage Patterns:**
- **Pub/Sub:** 6 channels for inter-service messaging
  - `download:job:created`, `download:job:completed`
  - `processing:job:completed`, `broadcast:all`
  - `websocket:messages`
  
- **Job Storage:** Key-value store for job state
  - `download:job:{jobId}`
  - `processing:job:{jobId}`
  - `analysis:job:{jobId}`
  - `track:{trackId}:jobs` (set)
  - `track:{trackId}:autoProcess/autoAnalyze` (settings)

- **Connections:** 11 Redis client instances across 5 services

**Problem:** Redis is overkill for this use case. All functionality can be replaced by Supabase with better features.

### 3. Underutilized Supabase
Currently only used for:
- API Gateway config endpoint (minimal)
- Frontend env loading (minimal)

**Not using:**
- Realtime (perfect for pub/sub replacement)
- Postgres (perfect for job storage)
- Storage (could replace shared volumes)
- Auth (not implemented)
- Edge Functions (not explored)

---

## Consolidation Strategy

### Phase 1: Docker Cleanup (Immediate - 1 day)
**Target:** 81 → 12 files (85% reduction)

**Actions:**
1. Delete `docker/.old/` (8 files)
2. Consolidate to 3 base images:
   - `docker/base/Dockerfile.node-base`
   - `docker/base/Dockerfile.python-node-base`
   - `docker/base/Dockerfile.gpu-base`
3. Standardize 7 service Dockerfiles:
   - `docker/services/Dockerfile.{service-name}`
4. Consolidate to 2 compose files:
   - `docker-compose.yml` (base config with profiles)
   - `docker-compose.override.yml` (dev overrides)

**Impact:** Massive reduction in maintenance burden, faster builds with shared base images

---

### Phase 2: Redis → Supabase Realtime (Short-term - 3-5 days)
**Feasibility:** HIGH - Direct API mapping

**Migration Path:**

| Current (Redis) | Future (Supabase Realtime) | Benefit |
|-----------------|---------------------------|---------|
| `pub.publish('download:job:created')` | `supabase.channel('download-jobs').send({type: 'created'})` | Automatic scaling |
| `sub.subscribe('broadcast:all')` | `supabase.channel('broadcast').on('broadcast', fn)` | No connection management |
| Custom WebSocket server | Supabase Realtime channels | Presence tracking included |
| Redis Commander GUI | Supabase Dashboard | Unified monitoring |

**Services to Update:**
- `backend/analysis/src/index.js` (3 Redis clients → 1 Supabase client)
- `backend/processing/src/index.js` (3 Redis clients → 1 Supabase client)
- `backend/download/src/index.js` (2 Redis clients → 1 Supabase client)
- `backend/websocket/src/index.js` (2 Redis clients → Supabase Realtime proxy or eliminate)

**Result:** Remove Redis container, Redis Commander container

---

### Phase 3: Job Storage → Supabase Postgres (Medium-term - 5-7 days)
**Feasibility:** HIGH - Simple schema design

**Proposed Schema:**
```sql
-- Download Jobs
CREATE TABLE download_jobs (
  id UUID PRIMARY KEY,
  track_id TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  output_path TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Processing Jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY,
  track_id TEXT NOT NULL,
  download_job_id UUID REFERENCES download_jobs(id),
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  model TEXT,
  options JSONB,
  output_paths TEXT[],
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analysis Jobs
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY,
  track_id TEXT NOT NULL,
  processing_job_id UUID REFERENCES processing_jobs(id),
  status TEXT NOT NULL,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track Settings
CREATE TABLE track_settings (
  track_id TEXT PRIMARY KEY,
  auto_process BOOLEAN DEFAULT false,
  auto_analyze BOOLEAN DEFAULT false,
  separation_options JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Migration Examples:**

| Before (Redis) | After (Supabase) |
|----------------|------------------|
| `redis.set('download:job:123', JSON.stringify(job))` | `supabase.from('download_jobs').upsert(job)` |
| `redis.get('download:job:123')` | `supabase.from('download_jobs').select().eq('id', '123').single()` |
| `redis.sadd('track:abc:jobs', '123')` | Foreign key relationship (automatic) |
| `redis.get('track:abc:autoProcess')` | `supabase.from('track_settings').select('auto_process').eq('track_id', 'abc')` |

**Bonus:** Enable Supabase Postgres Changes for automatic pub/sub when job status updates
```javascript
supabase
  .channel('job-updates')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'download_jobs' },
    (payload) => console.log('Job updated:', payload)
  )
  .subscribe()
```

**Result:** Better querying, relationships, transactions, automatic backups

---

### Phase 4: WebSocket Consolidation (Optional - 2-3 days)
**Options:**
1. **Keep as Supabase Realtime proxy** (easier migration)
   - Update `backend/websocket/src/index.js` to proxy Supabase Realtime
   - Maintains existing frontend WebSocket clients
   
2. **Eliminate entirely** (cleaner architecture)
   - Frontend connects directly to Supabase Realtime
   - Remove `websocket-service` container
   - Update frontend to use `@supabase/supabase-js` client

**Recommendation:** Option 2 for long-term simplicity

---

## Final Architecture

### Before
```
Services: 7 backend + frontend + redis + redis-commander + adminer = 11 containers
Docker Files: 81
Infrastructure: Redis (self-hosted), Supabase (minimal)
```

### After
```
Services: 6-7 backend + frontend + adminer = 8-9 containers
Docker Files: 12
Infrastructure: Supabase (Realtime + Postgres + Storage + Auth)
```

**Containers Removed:**
- ❌ Redis
- ❌ Redis Commander
- ❌ WebSocket Service (optional)

**Infrastructure Simplified:**
- ✅ Supabase Realtime (replaces Redis pub/sub + WebSocket)
- ✅ Supabase Postgres (replaces Redis key-value storage)
- ✅ Supabase Dashboard (replaces Redis Commander)

---

## Expected Outcomes

### Docker Simplification
- **Before:** 81 Docker files scattered across 6 directories
- **After:** 12 Docker files in organized structure
- **Reduction:** 85%

### Infrastructure Simplification
- **Before:** Redis + WebSocket + minimal Supabase
- **After:** Comprehensive Supabase integration
- **Containers:** 11 → 8-9 (18-27% reduction)

### Operational Benefits
- **Deployment:** Simpler docker-compose, fewer services
- **Scaling:** Supabase handles horizontal scaling automatically
- **Monitoring:** Unified Supabase dashboard for all data
- **Maintenance:** No Redis tuning, backups, or version management
- **Development:** Supabase local dev via CLI

### Performance
- **Latency:** Comparable or better (Supabase globally distributed)
- **Reliability:** Higher (managed service with SLA)
- **Scalability:** Superior (automatic)
- **Cost:** Potentially lower (no self-hosted infrastructure)

---

## Migration Roadmap

### ✅ Immediate (1 day)
- Clean up old/backup Docker files
- Consolidate base images to 3 canonical versions
- Remove duplicate service Dockerfile variants
- Create consolidated docker-compose files

### 🔄 Short-term (1-2 weeks)
- Set up Supabase project with Realtime enabled
- Create Postgres schema for job storage
- Implement `backend/shared/supabase-realtime.js` wrapper
- Migrate download-service to Supabase (pilot test)

### 📋 Medium-term (3-4 weeks)
- Migrate all pub/sub channels to Supabase Realtime
- Migrate all job storage to Supabase Postgres
- Update/eliminate WebSocket service
- Remove Redis from docker-compose.yml

### 🚀 Long-term (Future)
- Supabase Storage for audio file management
- Supabase Auth for user management
- Supabase Edge Functions for serverless processing
- GPU processing via Edge Functions + external services

---

## Risk Mitigation

1. **Phased Migration:** One service at a time, run Redis + Supabase in parallel during transition
2. **Rollback Plan:** Keep Redis config in git, easy revert if needed
3. **Testing:** Comprehensive integration tests for pub/sub and storage
4. **Monitoring:** Set up Supabase monitoring before full migration
5. **Documentation:** Document schema, channels, and migration steps

---

## Recommendations Priority

1. **Priority 1 (Do Now):** Clean up Docker file sprawl - Low risk, high impact
2. **Priority 2 (This Sprint):** Set up Supabase and migrate job storage - Medium risk, high value
3. **Priority 3 (Next Sprint):** Migrate Redis pub/sub to Supabase Realtime - Medium risk, high value
4. **Priority 4 (Soon):** Consolidate/eliminate WebSocket service - Low risk, medium value
5. **Priority 5 (Future):** Explore Supabase Storage for audio - Low priority, optimization

---

## Conclusion

The current infrastructure has significant technical debt (81 Docker files!) and over-engineering (Redis for simple pub/sub + KV storage). 

**The path forward is clear:**
1. Immediate Docker cleanup (85% file reduction)
2. Strategic migration to Supabase ecosystem
3. Simpler, more scalable, easier to maintain

**Expected ROI:**
- Less infrastructure to manage
- Better performance and reliability
- Lower operational costs
- Unified monitoring and management
- Foundation for future features (Auth, Storage, Edge Functions)

---

**Next Steps:** Review detailed consolidation plan in `infrastructure-detailed.json`
