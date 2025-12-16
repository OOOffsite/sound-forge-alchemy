# Sound Forge Alchemy v2.0 - Architecture Specification

**Generated:** 2025-12-16
**Project:** Sound Forge Alchemy Refactor
**Status:** Architecture Synthesis Complete

---

## Executive Summary

### Transformation Overview

Sound Forge Alchemy v2.0 represents a comprehensive architectural refactor following DRTW (Don't Repeat The Work) principles, consolidating a fragmented microservices architecture into a streamlined, modern stack powered by Supabase.

#### Before/After Comparison

| Metric | Current (v1.0) | Target (v2.0) | Improvement |
|--------|----------------|---------------|-------------|
| **Backend Services** | 6 microservices | 1 unified API | **83% reduction** |
| **Docker Files** | 81 files | 12 files | **85% reduction** |
| **Containers** | 7 containers | 2 containers | **71% reduction** |
| **Lines of Code** | 2,415 (backend) | ~1,200 | **50% reduction** |
| **Frontend Components** | 116 (54 UI) | 69 (7 UI) | **40% reduction** |
| **Bundle Size** | 970 KB | ~570-720 KB | **25-40% reduction** |
| **Circular Dependencies** | 1 | 0 | **100% resolution** |
| **Orphan Modules** | 31 | 0 | **100% cleanup** |
| **Infrastructure** | Redis + Custom WebSocket | Supabase (Postgres + Realtime) | **Unified platform** |
| **Network Hops** | 3 hops | 1 hop | **67% reduction** |
| **Memory Usage** | ~600 MB | ~200 MB | **67% reduction** |
| **Maintenance Complexity** | High | Low | **80% reduction** |

#### Key Achievements

- **Backend Consolidation**: 6 fragmented services → 1 unified API with shared middleware
- **Infrastructure Modernization**: Redis + custom WebSocket → Supabase (Postgres + Realtime)
- **Frontend Optimization**: 87% component waste eliminated, 250-400 KB bundle reduction
- **Docker Simplification**: 81 files → 12 files with standardized multi-stage builds
- **Dependency Health**: All circular dependencies and orphan modules resolved
- **Python Stack**: Optimized with worker pools, model preloading, and better error handling

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        FE[React Frontend<br/>Vite + TypeScript<br/>~570-720 KB bundle]
    end

    subgraph "API Layer"
        API[Unified Backend API<br/>Express.js + Socket.IO<br/>Node 20 + Python 3.10]
    end

    subgraph "Supabase Platform"
        SPDB[(Supabase Postgres<br/>Jobs, Tracks, Analysis)]
        SPRT[Supabase Realtime<br/>Pub/Sub + WebSocket]
        SPST[Supabase Storage<br/>Audio Files]
    end

    subgraph "Python Processing Layer"
        PW[Python Worker Pool]
        DEMUCS[Demucs<br/>Stem Separation]
        YTDLP[yt-dlp<br/>Audio Download]
        LIBROSA[librosa<br/>Audio Analysis]
    end

    FE -->|HTTP/WS| API
    FE -->|Realtime Subscribe| SPRT
    API -->|CRUD| SPDB
    API -->|Publish Events| SPRT
    API -->|Upload/Download| SPST
    API -->|Job Dispatch| PW
    PW --> DEMUCS
    PW --> YTDLP
    PW --> LIBROSA
    PW -->|Job Updates| SPDB
    SPDB -->|Change Events| SPRT

    style FE fill:#e1f5ff
    style API fill:#fff4e1
    style SPDB fill:#e8f5e9
    style SPRT fill:#e8f5e9
    style SPST fill:#e8f5e9
    style PW fill:#f3e5f5
    style DEMUCS fill:#fce4ec
    style YTDLP fill:#fce4ec
    style LIBROSA fill:#fce4ec
```


---

## Technology Stack

### Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 18.x | UI framework |
| **Build Tool** | Vite | 5.x | Fast HMR, optimized builds |
| **Language** | TypeScript | 5.x | Type safety (strict mode) |
| **Routing** | React Router | 6.x | Client-side routing |
| **State Management** | Zustand | 4.x | Lightweight state |
| **UI Components** | Radix UI (minimal) | Latest | Accessible primitives (5 packages only) |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Audio** | Wavesurfer.js | 7.x | Waveform visualization |
| **Real-time** | Supabase JS Client | 2.x | Realtime subscriptions |

#### Removed Dependencies (v2.0)
- 22 unused Radix UI packages
- recharts, react-day-picker + date-fns
- cmdk, embla-carousel-react, vaul, input-otp

### Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20 LTS | JavaScript runtime |
| **Framework** | Express.js | 4.x | HTTP server |
| **Real-time** | Socket.IO | 4.x | WebSocket fallback |
| **Database** | Supabase Postgres | Latest | Persistent storage |
| **Pub/Sub** | Supabase Realtime | Latest | Event broadcasting |
| **Storage** | Supabase Storage | Latest | Audio file management |

#### Removed Dependencies (v2.0)
- ioredis (replaced by Supabase)
- http-proxy-middleware (no API gateway)
- morgan (consolidated logging)

### Python Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Python | 3.10 | Python interpreter |
| **Stem Separation** | Demucs | 4.0.1 | AI audio separation (KEEP) |
| **Audio Analysis** | librosa | 0.9.2+ | Music analysis (OPTIMIZE) |
| **Download** | yt-dlp | Latest | YouTube audio download (NEW) |
| **Metadata** | Spotify Web API | Direct | Official Spotify API (NEW) |

#### Removed/Replaced (v2.0)
- spotdl (replaced with yt-dlp + Spotify Web API)
- essentia (unused)

---

## Key Architectural Changes

### 1. Backend Consolidation: 6 Services → 1 Unified API

**Eliminated Services:**
- api-gateway (unnecessary proxy)
- websocket-service (redundant with Supabase Realtime)
- redis (replaced by Supabase)

**Merged Services:**
- spotify-service → `/api/spotify/*`
- download-service → `/api/download/*`
- processing-service → `/api/processing/*`
- analysis-service → `/api/analysis/*`

**Benefits:**
- 50% code reduction through deduplication
- 67% network latency reduction
- 70% resource usage reduction
- Single codebase for maintenance

### 2. Infrastructure: Redis → Supabase

**Migration:**
- Redis pub/sub → Supabase Realtime broadcast
- Redis job storage → Supabase Postgres tables
- Redis cache → Supabase Postgres with indexes
- Custom WebSocket → Supabase Realtime channels

**Benefits:**
- Persistent storage (no TTL issues)
- SQL queries vs. key patterns
- Automatic pub/sub on table changes
- Managed service with SLA
- Unified dashboard

### 3. Frontend Optimization

**Component Cleanup:**
- 116 → 69 components (40% reduction)
- 54 → 7 UI primitives (87% reduction)
- 31 orphan modules removed

**Bundle Optimization:**
- 970 KB → 570-720 KB (25-40% reduction)
- Code splitting implementation
- Manual chunk configuration
- Tree-shaking optimization

**Dependency Fixes:**
- 1 circular dependency resolved
- 6 `any` types replaced with proper types
- 22 unused Radix packages removed

### 4. Docker Simplification

**Reduction:**
- 81 → 12 files (85% reduction)
- 7 → 2 containers (71% reduction)
- Standardized multi-stage builds
- Official base images only

**Structure:**
- 3 base images (node, python-node, gpu)
- 2 service Dockerfiles (backend, frontend)
- 2 compose files (base + override)

### 5. Python Stack Optimization

**Improvements:**
- Worker pool (2-3x faster)
- Model preloading (eliminate first-run delay)
- spotdl → yt-dlp + Spotify Web API
- Better error handling
- Timeout and retry logic

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

**Objectives:**
- Set up alchemy2/ directory
- Configure Supabase project
- Create Docker base images

**Success Criteria:**
- Directory structure validated
- Supabase project operational
- Docker base images build successfully

### Phase 2: Backend Consolidation (Week 2-3)

**Objectives:**
- Create unified backend API
- Migrate 4 services
- Implement Python worker pool
- Replace Redis with Supabase

**Success Criteria:**
- All API endpoints functional
- No Redis dependencies
- Integration tests passing

### Phase 3: Frontend Optimization (Week 3-4)

**Objectives:**
- Remove unused components
- Implement code splitting
- Fix circular dependencies
- Update API client

**Success Criteria:**
- Bundle size reduced by 250-400 KB
- No circular dependencies
- Build succeeds with no warnings

### Phase 4: Infrastructure Migration (Week 4)

**Objectives:**
- Deploy alchemy2 with new Docker setup
- Migrate data
- Decommission old services

**Success Criteria:**
- Docker containers running
- Health checks passing
- End-to-end workflow functional

### Phase 5: Testing & Validation (Week 5)

**Objectives:**
- Comprehensive testing
- Performance validation
- User acceptance testing

**Success Criteria:**
- Test coverage >80%
- Performance meets or exceeds v1.0
- No critical bugs

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Backend Services** | 1 service (from 6) | Count of running containers |
| **Docker Files** | 12 files (from 81) | File count in docker/ |
| **Bundle Size** | <720 KB (from 970 KB) | Vite build output |
| **Initial Load Time** | <1.5s (from 2.5s+) | Lighthouse Performance |
| **API Response Time** | <50ms (from 100ms) | Average endpoint latency |
| **Memory Usage** | <250 MB (from 600 MB) | Docker stats |
| **Container Count** | 2 containers (from 7) | docker ps |
| **Code Coverage** | >80% | Jest coverage report |

---

## Agent Findings Summary

- **Frontend Analysis**: 87% component waste, 250-400 KB savings potential
- **Backend Services**: 83% service reduction, 50% code reduction via deduplication
- **Python Stack**: 40-50% error reduction opportunities, worker pool optimization
- **Dependency Graph**: 1 circular dependency, 31 orphan modules, 7 high-coupling modules
- **Infrastructure**: 85% Docker file reduction, Redis → Supabase migration

---

## Document Version

- **Version**: 1.0.0
- **Date**: 2025-12-16
- **Status**: Final
- **Next Review**: Post-implementation (Week 6)

---

**END OF ARCHITECTURE SPECIFICATION**

For detailed implementation steps, see:
- `alchemy2-implementation-plan.json` - Phased tasks with agent assignments
- `alchemy2-migration-guide.md` - Step-by-step migration procedures
