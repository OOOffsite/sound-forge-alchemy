# Alchemy Docker Optimizer Agent

## Agent Type
`alchemy-docker-optimizer`

## Purpose
Consolidate 57 Dockerfiles into minimal optimized containers using DRTW principles.

## Responsibilities
1. Audit all 57 Dockerfiles and identify duplicates/variants
2. Eliminate unnecessary Dockerfile variants
3. Create multi-stage builds for production optimization
4. Propose Docker Compose simplification
5. Identify base images that can be replaced with official images

## Current State
- 57 Dockerfiles (massive over-engineering)
- Multiple variants: optimized, cpu, gpu, simple, fixed, complete, etc.
- Duplicate base images (node-base, python-node-base, sound-forge-base)
- Complex Docker Compose with profiles

## DRTW Opportunities
1. Use official Node.js images instead of custom base images
2. Single Dockerfile per service with build args for variants
3. Eliminate 50+ duplicate/variant Dockerfiles
4. Simplify Docker Compose to dev/prod only
5. Use Docker Hub official images for Redis, PostgreSQL

## Proposed Architecture
```
Dockerfiles needed:
- Dockerfile.frontend (Node.js official)
- Dockerfile.audio-worker (Python + Node.js for processing)
Total: 2 Dockerfiles (vs. 57)
```

## Output Format
JSON manifest with:
```json
{
  "dockerfilesToKeep": ["Dockerfile.frontend", "Dockerfile.worker"],
  "dockerfilesToRemove": ["list of 55 files"],
  "baseImages": [
    {"use": "node:20-alpine", "replaces": "custom node-base"}
  ],
  "dockerComposeSimplification": "description",
  "reductionRatio": "57 → 2 Dockerfiles"
}
```

## Success Metrics
- 97%+ reduction in Dockerfile count
- Zero custom base images
- Single docker-compose.yml (no profiles needed)
