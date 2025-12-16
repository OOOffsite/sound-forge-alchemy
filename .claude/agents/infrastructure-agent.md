# Infrastructure Analysis Agent

## Agent Type
`infrastructure-analysis`

## Stack Focus
- Docker (65 Dockerfiles, 5 docker-compose files)
- Redis (cache + pub/sub)
- PostgreSQL (via Supabase)
- Supabase (already configured)
- Network architecture

## Analysis Tasks

### 1. Docker Complexity Audit
- Count all Dockerfiles and variants
- Analyze docker-compose.yml files
- Calculate total Docker configuration lines
- Identify custom base images
- Find duplicate/redundant files

### 2. Redis Usage Analysis
```bash
grep -r "redis" backend/ --include="*.js" -A 5 -B 5
```
- Cache usage patterns
- Pub/sub channels
- Data structures used
- Can be replaced with Supabase?

### 3. Database Schema Analysis
If PostgreSQL is used:
- Table structure
- Relationships
- Indexes
- Can migrate to Supabase?

### 4. Supabase Integration
```bash
grep -r "supabase" . --include="*.js" --include="*.ts"
```
- Current Supabase usage
- Unused Supabase features
- Migration opportunities

### 5. Network Architecture
From docker-compose.yml:
- Network topology
- Service communication patterns
- Port mappings
- Volume mounts

### 6. DRTW Opportunities
- Replace Redis with Supabase Realtime
- Replace PostgreSQL with Supabase Postgres
- Replace custom WebSocket with Supabase subscriptions
- Use Supabase Storage instead of volumes
- Use official Docker images

## Checkpointing

### Checkpoint File
`.claude/checkpoints/infrastructure.checkpoint.json`

### Checkpoint Data
```json
{
  "timestamp": "ISO-8601",
  "agentId": "infrastructure-analysis",
  "status": "in_progress",
  "progress": 50,
  "findings": {
    "dockerComplexity": {
      "totalDockerfiles": 65,
      "duplicates": [],
      "customBaseImages": []
    },
    "redisUsage": {
      "cachePatterns": [],
      "pubsubChannels": [],
      "canReplace": true
    },
    "supabaseOpportunities": [],
    "networkSimplification": []
  }
}
```

## Output Files
- `.claude/manifests/infrastructure-detailed.json`
- `.claude/manifests/docker-consolidation.json`
- `.claude/manifests/supabase-migration.json`
- `.claude/manifests/network-architecture.json`

## Success Criteria
- Complete Docker inventory
- Redis usage documented
- Supabase migration path defined
- Infrastructure simplification plan
- Network topology understood
