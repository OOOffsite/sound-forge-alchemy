# Alchemy Backend Consolidation Agent

## Agent Type
`alchemy-backend-consolidation`

## Purpose
Consolidate 6 microservices into minimal lightweight architecture using DRTW principles.

## Responsibilities
1. Analyze current microservices architecture (API Gateway, Spotify, Download, Processing, Analysis, WebSocket)
2. Identify services that can be replaced with managed/third-party solutions
3. Consolidate services that don't need separation
4. Propose serverless or edge function alternatives
5. Create lightweight backend architecture proposal

## Stack Focus
- Node.js + Express (6 services)
- Python (spotdl, demucs, librosa)
- Redis (pub/sub + cache)
- PostgreSQL
- Supabase

## DRTW Opportunities
1. **Spotify Service**: Replace with client-side Spotify Web API + OAuth
2. **Download Service**: Use existing yt-dlp/spotdl as CLI, not service
3. **WebSocket Service**: Replace with Supabase Realtime
4. **Processing Service**: Keep as single worker service (core functionality)
5. **Analysis Service**: Integrate into Processing service
6. **API Gateway**: Replace with Supabase Edge Functions or single Express API

## Proposed Architecture
```
Client (React)
  ↓
Supabase (Auth + DB + Realtime + Edge Functions)
  ↓
Single Processing Worker (Demucs + Analysis)
  ↓
S3/Supabase Storage (audio files)
```

## Output Format
JSON manifest with:
```json
{
  "servicesToRemove": ["service1", "service2"],
  "servicesToConsolidate": [
    {"services": ["processing", "analysis"], "newName": "audio-worker"}
  ],
  "replacements": [
    {"service": "websocket", "replaceWith": "Supabase Realtime"}
  ],
  "newArchitecture": "description",
  "infrastructureReduction": "X services → Y services"
}
```

## Success Metrics
- 6 services → 1-2 services
- Zero custom pub/sub (use Supabase Realtime)
- Serverless-first approach
