# TDD Orchestrator Agent

## Agent Type
`tdd-orchestrator`

## Purpose
Coordinate all TDD agents across Phases 2-5 with strict test-first enforcement.

## TDD Workflow Orchestration

### Phase 2: Backend Migration (TDD)
**Parallel TDD Agents (4 concurrent):**
1. Spotify Routes TDD Agent
2. Download Routes TDD Agent
3. Processing Routes TDD Agent
4. Analysis Routes TDD Agent

**Each follows:**
1. RED: Write tests (checkpoint)
2. GREEN: Implement (checkpoint)
3. REFACTOR: Optimize (checkpoint)

### Phase 3: Frontend Migration (TDD)
**Parallel TDD Agents (3 concurrent):**
1. Components TDD Agent
2. Hooks TDD Agent
3. Integration TDD Agent

### Phase 4: Infrastructure (TDD)
**Parallel TDD Agents (2 concurrent):**
1. Docker Build Tests Agent
2. Supabase Migration Tests Agent

### Phase 5: E2E Validation (TDD)
**Parallel TDD Agents (3 concurrent):**
1. User Flow Tests Agent
2. Performance Tests Agent
3. Load Tests Agent

## TDD Enforcement Rules

### Rule 1: No Code Without Tests
- Reject any implementation without corresponding tests
- Tests must be written and failing BEFORE implementation

### Rule 2: 95% Coverage Minimum
- Each agent must achieve 95%+ coverage
- Coverage checked at each checkpoint
- Fail fast if coverage drops

### Rule 3: Red-Green-Refactor Cycle
```
RED (Write Test) → Checkpoint
  ↓
GREEN (Pass Test) → Checkpoint
  ↓
REFACTOR (Optimize) → Checkpoint
  ↓
Next Test
```

### Rule 4: Parallel Execution with Dependencies
```
Phase 2 Backend (Parallel):
├─ Spotify Routes ──┐
├─ Download Routes ─┼─→ All Complete → Phase 3
├─ Processing Routes┤
└─ Analysis Routes ─┘

Phase 3 Frontend (Parallel):
├─ Components ──┐
├─ Hooks ───────┼─→ All Complete → Phase 4
└─ Integration ─┘

Phase 4 Infrastructure (Parallel):
├─ Docker ──┐
└─ Supabase┴─→ Complete → Phase 5

Phase 5 E2E (Parallel):
├─ User Flows ──┐
├─ Performance ─┼─→ All Complete → DONE
└─ Load Tests ──┘
```

## Checkpointing Strategy

### Master Checkpoint
```json
{
  "timestamp": "ISO-8601",
  "currentPhase": 2,
  "tddCycle": "green",
  "agents": {
    "spotify-tdd": {
      "status": "green",
      "coverage": 96.5,
      "testsWritten": 12,
      "testsPassing": 12
    },
    "download-tdd": {
      "status": "red",
      "coverage": 0,
      "testsWritten": 8,
      "testsPassing": 0
    }
  },
  "overallCoverage": 48.2,
  "targetCoverage": 95.0
}
```

### Agent Checkpoints
Each agent writes checkpoint after each cycle:
- `.claude/checkpoints/tdd-{agent}-red.json`
- `.claude/checkpoints/tdd-{agent}-green.json`
- `.claude/checkpoints/tdd-{agent}-refactor.json`

## Test Runners

### Backend (Jest)
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 95,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

### Frontend (Vitest)
```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      }
    }
  }
});
```

## Continuous Monitoring

### Watch Mode
Run tests in watch mode during development:
```bash
# Backend
cd alchemy2/backend && npm run test:watch

# Frontend
cd alchemy2/frontend && npm run test:watch
```

### Coverage Reporting
Generate coverage reports after each phase:
```bash
npm run test:coverage
open coverage/index.html
```

## Deployment Gates

### Phase 2 → Phase 3 Gate
- ✅ All backend tests passing
- ✅ 95%+ backend coverage
- ✅ All Supabase operations tested
- ✅ Worker integration tested

### Phase 3 → Phase 4 Gate
- ✅ All frontend tests passing
- ✅ 95%+ frontend coverage
- ✅ All components tested
- ✅ Integration tests passing

### Phase 4 → Phase 5 Gate
- ✅ Docker builds tested
- ✅ Supabase migrations tested
- ✅ Infrastructure validated

### Phase 5 → Complete
- ✅ All E2E tests passing
- ✅ Performance targets met
- ✅ Load tests passing
- ✅ Overall coverage >95%

## Success Criteria

- ✅ All phases completed with TDD
- ✅ 95%+ coverage maintained
- ✅ Zero failing tests
- ✅ All checkpoints written
- ✅ Documentation complete
