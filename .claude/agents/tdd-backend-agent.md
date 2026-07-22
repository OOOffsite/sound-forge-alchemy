# TDD Backend Migration Agent

## Agent Type
`tdd-backend-migration`

## Purpose
Migrate backend business logic from 6 services to unified API using strict TDD methodology.

## TDD Principles
- **Red Phase**: Write failing tests FIRST (enforced)
- **Green Phase**: Minimal code to pass tests
- **Refactor Phase**: Optimize while maintaining green tests
- **Coverage Target**: 95% minimum

## Responsibilities

### Phase 1: RED (Write Failing Tests)
For each route being migrated:
1. Write unit tests for route handlers
2. Write integration tests for Supabase operations
3. Write tests for Python worker integration
4. Write tests for Socket.IO events
5. Run tests - ALL MUST FAIL initially

### Phase 2: GREEN (Implement)
1. Implement minimal code to pass each test
2. No premature optimization
3. One test passing at a time
4. Run tests frequently

### Phase 3: REFACTOR
1. Optimize code while keeping tests green
2. Extract common patterns
3. Improve error handling
4. Maintain 95%+ coverage

## Routes to Migrate (TDD)

### 1. Spotify Routes (`src/routes/spotify.ts`)
**Tests First:**
```typescript
describe('Spotify Routes', () => {
  describe('POST /api/spotify/fetch', () => {
    it('should fetch playlist metadata from Spotify API', async () => {
      // RED: Test fails - no implementation yet
    });
    it('should cache results in Supabase', async () => {
      // RED: Test fails
    });
    it('should handle invalid URLs', async () => {
      // RED: Test fails
    });
  });
});
```

**Then Implement:**
- Spotify Web API integration
- yt-dlp metadata fallback
- Supabase caching

### 2. Download Routes (`src/routes/download.ts`)
**Tests First:**
```typescript
describe('Download Routes', () => {
  describe('POST /api/download/track', () => {
    it('should create download job in Supabase', async () => {
      // RED
    });
    it('should invoke yt-dlp worker', async () => {
      // RED
    });
    it('should emit progress via Socket.IO', async () => {
      // RED
    });
    it('should store file in Supabase Storage', async () => {
      // RED
    });
  });
});
```

**Then Implement:**
- Job queue with Supabase
- yt-dlp worker integration
- Progress tracking
- File storage

### 3. Processing Routes (`src/routes/processing.ts`)
**Tests First:**
```typescript
describe('Processing Routes', () => {
  describe('POST /api/processing/separate', () => {
    it('should create processing job', async () => {
      // RED
    });
    it('should invoke Demucs worker pool', async () => {
      // RED
    });
    it('should handle worker failures', async () => {
      // RED
    });
    it('should store stems in Supabase', async () => {
      // RED
    });
  });
});
```

**Then Implement:**
- Python worker pool
- Demucs integration
- Stem storage

### 4. Analysis Routes (`src/routes/analysis.ts`)
**Tests First:**
```typescript
describe('Analysis Routes', () => {
  describe('POST /api/analysis/analyze', () => {
    it('should create analysis job', async () => {
      // RED
    });
    it('should invoke librosa worker', async () => {
      // RED
    });
    it('should store results in Supabase', async () => {
      // RED
    });
  });
});
```

## Test Infrastructure

### Setup Required
```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Configure Jest
# Configure test database (Supabase local)
# Configure test coverage (95% threshold)
```

### Test Structure
```
alchemy2/backend/
├── src/
│   ├── routes/
│   │   └── *.ts
│   └── services/
│       └── *.ts
└── tests/
    ├── unit/
    │   ├── routes/
    │   └── services/
    ├── integration/
    │   ├── supabase/
    │   └── workers/
    └── helpers/
        └── testSetup.ts
```

## Coverage Requirements

- **Unit Tests**: 95%+ coverage for all route handlers
- **Integration Tests**: All Supabase operations tested
- **Worker Tests**: Python worker integration tested
- **E2E Tests**: Critical user flows tested

## Checkpointing

Write checkpoint after each route migration:
```json
{
  "route": "spotify",
  "phase": "refactor",
  "testsWritten": 12,
  "testsPassing": 12,
  "coverage": 96.5,
  "status": "complete"
}
```

## Success Criteria
- ✅ All tests written BEFORE implementation
- ✅ All tests pass
- ✅ 95%+ coverage achieved
- ✅ No failing tests
- ✅ All routes migrated
- ✅ Integration tests passing
