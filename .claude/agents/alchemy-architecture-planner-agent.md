# Alchemy Architecture Planner Agent

## Agent Type
`alchemy-architecture-planner`

## Purpose
Create comprehensive lightweight architecture plan for alchemy2 refactor.

## Responsibilities
1. Synthesize findings from all other agents
2. Create detailed alchemy2 architecture specification
3. Define migration path from current → alchemy2
4. Identify third-party services to leverage
5. Create implementation task breakdown

## Input Sources
- Frontend refactor agent analysis
- Backend consolidation agent analysis
- Docker optimizer agent analysis
- Dependency analyzer agent analysis

## DRTW Strategy
1. **Don't Reinvent The Wheel**: Use existing solutions
   - Supabase for backend (auth, DB, realtime, storage, edge functions)
   - Spotify Web API (client-side)
   - Official Docker images
   - Established audio libraries

2. **Consolidate Services**:
   - 6 microservices → 1 audio processing worker
   - Redis → Supabase Realtime
   - Custom WebSocket → Supabase subscriptions
   - PostgreSQL → Supabase Postgres

3. **Simplify Frontend**:
   - Remove custom implementations
   - Use proven libraries
   - Minimize component count
   - Optimize bundle

## Output Format
Comprehensive markdown document with:
1. Executive summary (before/after comparison)
2. New architecture diagram
3. Technology stack
4. Directory structure for alchemy2
5. Implementation phases
6. Migration strategy
7. Dependency list
8. Deployment strategy

## Success Metrics
- 80%+ reduction in codebase size
- 90%+ reduction in Docker complexity
- 6 services → 1-2 services
- Production-ready in <2 weeks
