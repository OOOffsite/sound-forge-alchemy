# Orchestrator Agent - Alchemy Refactor

## Agent Type
`orchestrator`

## Purpose
Coordinate all specialized analysis agents, manage checkpointing, aggregate findings, and create final alchemy2 architecture.

## Responsibilities
1. Deploy specialized stack-based agents in parallel
2. Monitor agent progress and checkpoints
3. Handle agent failures and retries
4. Aggregate agent outputs into unified analysis
5. Synthesize final alchemy2 architecture specification
6. Create implementation task breakdown

## Managed Agents
1. **Frontend Analysis Agent** (React/TypeScript/Vite)
2. **Backend Services Agent** (Node.js/Express microservices)
3. **Python Stack Agent** (Demucs/librosa/spotdl)
4. **Dependency Graph Agent** (dependency-cruiser)
5. **Infrastructure Agent** (Docker/Redis/PostgreSQL/Supabase)
6. **Bundle Analysis Agent** (Vite bundle analysis)

## Checkpointing System

### Checkpoint Directory
`/Users/jeremiah/Developer/sound-forge-alchemy/.claude/checkpoints/`

### Checkpoint Schema
```json
{
  "timestamp": "ISO-8601",
  "phase": "analysis|planning|implementation",
  "agentId": "agent-name",
  "status": "in_progress|completed|failed",
  "progress": 0-100,
  "findings": {},
  "errors": [],
  "nextSteps": []
}
```

### Checkpoint Files
- `orchestrator-state.json` - Overall orchestration state
- `frontend-analysis.checkpoint.json` - Frontend agent checkpoint
- `backend-analysis.checkpoint.json` - Backend agent checkpoint
- `python-stack.checkpoint.json` - Python agent checkpoint
- `dependency-graph.checkpoint.json` - Dependency graph checkpoint
- `infrastructure.checkpoint.json` - Infrastructure checkpoint
- `bundle-analysis.checkpoint.json` - Bundle analysis checkpoint

## Workflow

### Phase 1: Agent Deployment (Parallel)
```
Deploy all 6 agents concurrently
↓
Monitor checkpoints every 30s
↓
Handle failures with exponential backoff
```

### Phase 2: Findings Aggregation
```
Wait for all agents to complete
↓
Read all checkpoint files
↓
Aggregate findings into unified dataset
↓
Identify conflicts/inconsistencies
```

### Phase 3: Architecture Synthesis
```
Apply DRTW principles to findings
↓
Create alchemy2 architecture specification
↓
Generate implementation tasks
↓
Create final checkpoint
```

## Output Files

### Checkpoints
- `.claude/checkpoints/*.checkpoint.json`
- `.claude/checkpoints/orchestrator-state.json`

### Final Outputs
- `.claude/manifests/alchemy2-architecture.md`
- `.claude/manifests/implementation-plan.json`
- `.claude/manifests/migration-guide.md`
- `.claude/manifests/orchestrator-report.md`

## Error Handling
- Retry failed agents up to 3 times
- Exponential backoff: 10s, 30s, 90s
- Partial success acceptable (minimum 4/6 agents)
- Log all errors to orchestrator checkpoint

## Success Criteria
- All 6 agents complete successfully
- Zero conflicts in findings
- Complete alchemy2 architecture
- Detailed implementation plan
- All checkpoints valid and complete
