# Backend Services Analysis Agent

## Agent Type
`backend-services-analysis`

## Stack Focus
- Node.js + Express (6 services)
- Redis (ioredis)
- PostgreSQL
- Supabase
- Python child processes (spotdl, demucs)

## Services to Analyze
1. `backend/api-gateway` - HTTP proxy
2. `backend/spotify` - Spotify API wrapper
3. `backend/download` - spotdl wrapper
4. `backend/processing` - Demucs orchestration
5. `backend/analysis` - librosa/essentia wrapper
6. `backend/websocket` - Socket.IO server

## Analysis Tasks

### 1. Service Complexity Analysis
For each service:
- Lines of code
- Endpoint count
- Business logic vs boilerplate ratio
- Inter-service dependencies

### 2. Dependency Analysis
```bash
cd backend/{service}
npx depcheck
npm ls --all --json
```
- Unused dependencies
- Duplicate dependencies across services
- Version inconsistencies
- Security vulnerabilities

### 3. Architecture Analysis
- Service communication patterns
- Shared code opportunities
- Database access patterns
- Redis usage (cache vs pub/sub)

### 4. Consolidation Opportunities
- Can service be eliminated?
- Can service be client-side?
- Can service be merged?
- Can service use managed alternative?

### 5. Code Quality
- Error handling patterns
- Logging consistency
- Environment variable usage
- Configuration management

## Checkpointing

### Checkpoint File
`.claude/checkpoints/backend-analysis.checkpoint.json`

### Checkpoint Data
```json
{
  "timestamp": "ISO-8601",
  "agentId": "backend-services-analysis",
  "status": "in_progress",
  "progress": 60,
  "servicesAnalyzed": ["api-gateway", "spotify"],
  "servicesRemaining": ["download", "processing", "analysis", "websocket"],
  "findings": {
    "totalLinesOfCode": 0,
    "totalEndpoints": 0,
    "servicesCanEliminate": [],
    "servicesCanConsolidate": [],
    "sharedDependencies": [],
    "unusedDependencies": {}
  }
}
```

## Output Files
- `.claude/manifests/backend-services-detailed.json`
- `.claude/manifests/service-consolidation-matrix.json`
- `.claude/manifests/shared-code-opportunities.json`

## Success Criteria
- All 6 services analyzed
- Consolidation plan created
- Shared dependencies identified
- Migration path defined
