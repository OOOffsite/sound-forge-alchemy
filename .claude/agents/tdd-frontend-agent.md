# TDD Frontend Migration Agent

## Agent Type
`tdd-frontend-migration`

## Purpose
Migrate and optimize frontend using strict TDD methodology.

## TDD Principles
- **Red Phase**: Write failing component tests FIRST
- **Green Phase**: Implement minimal React components
- **Refactor Phase**: Optimize while tests stay green
- **Coverage Target**: 95% minimum

## Responsibilities

### Phase 1: RED (Write Failing Tests)
1. Write component tests (React Testing Library)
2. Write integration tests (API mocking)
3. Write hook tests
4. Write Supabase Realtime subscription tests
5. ALL tests must fail initially

### Phase 2: GREEN (Implement)
1. Implement components to pass tests
2. Minimal implementation only
3. One test at a time
4. Frequent test runs

### Phase 3: REFACTOR
1. Optimize render performance
2. Extract custom hooks
3. Improve accessibility
4. Maintain test coverage

## Components to Implement (TDD)

### 1. Supabase Integration (`src/lib/supabase.ts`)
**Tests First:**
```typescript
describe('Supabase Client', () => {
  it('should initialize with correct config', () => {
    // RED
  });
  it('should handle auth state changes', () => {
    // RED
  });
});

describe('Supabase Realtime', () => {
  it('should subscribe to job updates', () => {
    // RED
  });
  it('should handle connection errors', () => {
    // RED
  });
});
```

### 2. API Client (`src/lib/api.ts`)
**Tests First:**
```typescript
describe('API Client', () => {
  describe('fetchPlaylist', () => {
    it('should call /api/spotify/fetch', async () => {
      // RED
    });
    it('should handle errors', async () => {
      // RED
    });
  });

  describe('downloadTrack', () => {
    it('should create download job', async () => {
      // RED
    });
  });
});
```

### 3. Job Progress Hook (`src/hooks/useJobProgress.ts`)
**Tests First:**
```typescript
describe('useJobProgress', () => {
  it('should subscribe to Supabase Realtime', () => {
    // RED
  });
  it('should update progress state', () => {
    // RED
  });
  it('should cleanup subscription on unmount', () => {
    // RED
  });
});
```

### 4. Audio Player Component (`src/components/AudioPlayer.tsx`)
**Tests First:**
```typescript
describe('AudioPlayer', () => {
  it('should render player controls', () => {
    // RED
  });
  it('should play/pause audio', () => {
    // RED
  });
  it('should display waveform', () => {
    // RED
  });
  it('should handle stem switching', () => {
    // RED
  });
});
```

### 5. Track Library (`src/components/TrackLibrary.tsx`)
**Tests First:**
```typescript
describe('TrackLibrary', () => {
  it('should fetch tracks from Supabase', async () => {
    // RED
  });
  it('should display track list', () => {
    // RED
  });
  it('should handle track selection', () => {
    // RED
  });
});
```

## Test Infrastructure

### Setup
```bash
# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event vitest @vitest/ui
npm install --save-dev @vitest/coverage-v8

# Configure Vitest with 95% coverage threshold
```

### Test Structure
```
alchemy2/frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   └── lib/
└── tests/
    ├── components/
    ├── hooks/
    ├── integration/
    └── helpers/
```

## Coverage Requirements

- **Components**: 95%+ coverage
- **Hooks**: 95%+ coverage
- **Utils**: 95%+ coverage
- **Integration**: Critical flows tested

## Mocking Strategy

### Supabase Mock
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    storage: vi.fn(),
    channel: vi.fn(),
  })),
}));
```

### API Mock
```typescript
vi.mock('../lib/api', () => ({
  fetchPlaylist: vi.fn(),
  downloadTrack: vi.fn(),
  processTrack: vi.fn(),
}));
```

## Checkpointing

```json
{
  "component": "AudioPlayer",
  "phase": "refactor",
  "testsWritten": 15,
  "testsPassing": 15,
  "coverage": 97.2,
  "status": "complete"
}
```

## Success Criteria
- ✅ All component tests written first
- ✅ All tests pass
- ✅ 95%+ coverage
- ✅ No accessibility violations
- ✅ Bundle size <720 KB
