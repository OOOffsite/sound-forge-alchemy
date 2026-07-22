# Supabase Infrastructure Tests

## Overview

Comprehensive TDD test suite for Sound Forge Alchemy's Supabase migration validation. Tests ensure schema correctness, RLS policies, indexes, Realtime configuration, storage buckets, functions, and triggers.

**TDD Approach**: All tests written in RED phase FIRST, then migrations verified/fixed in GREEN phase.

**Coverage Target**: 90% minimum (infrastructure testing)

## Test Structure

```
tests/infrastructure/
├── README.md                    # This file
├── vitest.config.ts            # Vitest configuration
├── setup.ts                    # Test setup and Supabase health check
├── helpers/
│   └── supabase.ts             # Test infrastructure helpers
└── supabase/
    ├── schema.test.ts          # Schema migration tests (10 tests)
    ├── indexes.test.ts         # Index performance tests (8 tests)
    ├── rls.test.ts             # RLS policy tests (9 tests)
    ├── realtime.test.ts        # Realtime configuration tests (6 tests)
    ├── storage.test.ts         # Storage bucket tests (10 tests)
    └── functions.test.ts       # Functions and triggers tests (9 tests)
```

## Prerequisites

### 1. Install Dependencies

From project root:
```bash
cd /Users/jeremiah/Developer/sound-forge-alchemy
npm install --save-dev pg @types/pg
```

### 2. Start Supabase

From alchemy2 directory:
```bash
cd alchemy2
supabase start
```

This will start:
- Supabase API: http://127.0.0.1:54321
- PostgreSQL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Supabase Studio: http://127.0.0.1:54323

### 3. Apply Migration

```bash
cd alchemy2
supabase db reset
```

This applies the migration at:
`alchemy2/supabase/migrations/20251216000001_initial_schema.sql`

## Running Tests

### Run All Infrastructure Tests
```bash
cd alchemy2
npm run test:infrastructure
```

### Run in Watch Mode
```bash
cd alchemy2
npm run test:infrastructure:watch
```

### Run with Coverage
```bash
cd alchemy2
npm run test:infrastructure:coverage
```

### Run Specific Test Suite
```bash
cd alchemy2/tests/infrastructure
vitest run supabase/schema.test.ts
vitest run supabase/indexes.test.ts
vitest run supabase/rls.test.ts
vitest run supabase/realtime.test.ts
vitest run supabase/storage.test.ts
vitest run supabase/functions.test.ts
```

## Test Suites

### 1. Schema Migration Tests (`schema.test.ts`)

**Tests**: 10

Validates:
- ✅ All 6 tables created (tracks, download_jobs, processing_jobs, analysis_jobs, stems, analysis_results)
- ✅ Correct columns for tracks table (id, spotify_id, title, artist, album, duration, etc.)
- ✅ Correct columns for job tables (id, track_id, status, progress, error, etc.)
- ✅ Proper column types (UUID, TEXT, INTEGER, BIGINT, JSONB, TIMESTAMPTZ)
- ✅ Primary keys on all tables (id column)
- ✅ Foreign keys (track_id → tracks.id, job references)
- ✅ Unique constraints (spotify_id UNIQUE)
- ✅ Default values (gen_random_uuid(), NOW())
- ✅ CHECK constraints (status IN ('queued', 'processing', 'completed', 'error'))
- ✅ CASCADE delete behavior on foreign keys

### 2. Index Tests (`indexes.test.ts`)

**Tests**: 8

Validates:
- ✅ Index on tracks.spotify_id
- ✅ Index on tracks.created_at (DESC)
- ✅ Indexes on job tables status columns
- ✅ Indexes on job tables track_id columns
- ✅ Indexes on stems table (track_id, processing_job_id, stem_type)
- ✅ Indexes on analysis_results table (track_id, analysis_job_id)
- ✅ Index performance verification (EXPLAIN ANALYZE)
- ✅ All 16 expected indexes exist

### 3. RLS Policy Tests (`rls.test.ts`)

**Tests**: 9

Validates:
- ✅ RLS enabled on all 6 tables
- ✅ Public read access on tracks (SELECT policy)
- ✅ Public write access on tracks (INSERT, UPDATE policies)
- ✅ RLS policies on all job tables
- ✅ Job creation and updates allowed
- ✅ RLS policies on stems and analysis_results
- ✅ Exactly 3 policies per table (SELECT, INSERT, UPDATE)
- ✅ Public access policies use (true) condition
- ✅ Reading data without authentication works

**Total Policies**: 18 (6 tables × 3 policies)

### 4. Realtime Tests (`realtime.test.ts`)

**Tests**: 6

Validates:
- ✅ Realtime enabled on job tables (download_jobs, processing_jobs, analysis_jobs)
- ✅ Realtime enabled on stems table
- ✅ Realtime NOT enabled on tracks table (static metadata)
- ✅ Broadcast INSERT events
- ✅ Broadcast UPDATE events
- ✅ Broadcast DELETE events
- ✅ Filter events by channel and conditions

**Realtime Tables**: 4 (download_jobs, processing_jobs, analysis_jobs, stems)

### 5. Storage Tests (`storage.test.ts`)

**Tests**: 10

Validates:
- ✅ audio-files bucket created
- ✅ stems bucket created
- ✅ Bucket access and settings configured
- ✅ File uploads to audio-files bucket
- ✅ File uploads to stems bucket
- ✅ File type restrictions (MIME type validation)
- ✅ File size limits enforced (50MiB)
- ✅ Allowed MIME types (audio/mpeg, audio/wav, audio/flac, audio/ogg)
- ✅ File downloads work
- ✅ Public URL generation

### 6. Functions and Triggers Tests (`functions.test.ts`)

**Tests**: 9

Validates:
- ✅ update_updated_at_column function exists
- ✅ get_track_progress function exists
- ✅ Triggers on tables with updated_at column
- ✅ Trigger updates updated_at on UPDATE
- ✅ Trigger does NOT fire on INSERT
- ✅ get_track_progress with multiple jobs (average)
- ✅ get_track_progress with no jobs (0%)
- ✅ get_track_progress with all completed jobs (100%)
- ✅ Exactly 2 functions and 4 triggers exist

## Test Helpers

Located in `helpers/supabase.ts`:

### Database Queries
- `getTableSchema(tableName)` - Get column information
- `getTableConstraints(tableName)` - Get primary keys, foreign keys, unique, check constraints
- `getTableIndexes(tableName)` - Get indexes
- `getTableTriggers(tableName)` - Get triggers
- `checkTablesExist(tableNames)` - Verify tables exist

### RLS Helpers
- `isRLSEnabled(tableName)` - Check if RLS is enabled
- `getRLSPolicies(tableName)` - Get RLS policies

### Realtime Helpers
- `isInRealtimePublication(tableName)` - Check if table is in Realtime

### Storage Helpers
- `getStorageBuckets()` - List storage buckets
- `getStorageBucket(bucketName)` - Get bucket details

### Functions/Triggers
- `functionExists(functionName)` - Check if function exists

### Test Data Helpers
- `insertTestTrack(data)` - Insert test track
- `insertTestJob(tableName, trackId, data)` - Insert test job
- `cleanupDatabase()` - Clean up test data

### Utilities
- `waitForCondition(condition, timeout)` - Wait for async condition
- `getPgClient()` - Get PostgreSQL client for direct queries

## Environment Variables

Tests use these environment variables (with defaults for local Supabase):

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

For production testing, override these in `.env.test`.

## Expected Results

### Total Tests: 52

- ✅ Schema migration tests: 10
- ✅ Index tests: 8
- ✅ RLS policy tests: 9
- ✅ Realtime tests: 6
- ✅ Storage tests: 10
- ✅ Functions/triggers tests: 9

### Coverage Thresholds: 90%

- Lines: 90%
- Functions: 90%
- Branches: 90%
- Statements: 90%

## TDD Workflow

### RED Phase (Write Failing Tests First)
1. ✅ Schema migration tests
2. ✅ Index tests
3. ✅ RLS policy tests
4. ✅ Realtime configuration tests
5. ✅ Storage bucket tests
6. ✅ Functions and triggers tests

### GREEN Phase (Fix Migrations to Pass Tests)
- Review test failures
- Update migration SQL if needed
- Re-run `supabase db reset`
- Verify all tests pass

### REFACTOR Phase (Optimize)
- Optimize indexes
- Refine RLS policies
- Improve function performance
- Maintain test coverage

## Troubleshooting

### Supabase Not Running
```
❌ Cannot connect to Supabase - is it running?
   Run: cd alchemy2 && supabase start
```

**Solution**: Start Supabase:
```bash
cd alchemy2
supabase start
```

### Migration Not Applied
Tests fail because tables don't exist.

**Solution**: Reset database:
```bash
cd alchemy2
supabase db reset
```

### Port Conflicts
Supabase uses ports 54321, 54322, 54323.

**Solution**: Stop conflicting services or configure different ports in `config.toml`.

### Test Timeouts
Tests timeout due to slow database queries.

**Solution**: Increase timeout in `vitest.config.ts`:
```typescript
testTimeout: 60000, // 60 seconds
```

### Realtime Events Not Received
Realtime subscription may be slow.

**Solution**: Increase wait time in `waitForCondition()` calls.

## Migration Validation Report

After running all tests, a validation report is generated showing:
- Total tests written/passing
- Tables validated
- Indexes verified
- RLS policies tested
- Realtime configuration verified
- Storage buckets validated
- Functions/triggers tested
- Any issues encountered

Run tests with `--reporter=json` to generate JSON report:
```bash
cd alchemy2/tests/infrastructure
vitest run --reporter=json > report.json
```

## Continuous Integration

Add to CI pipeline:

```yaml
# .github/workflows/test-infrastructure.yml
name: Infrastructure Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: cd alchemy2 && supabase start
      - run: cd alchemy2 && npm run test:infrastructure
```

## Contributing

When adding new migrations:

1. **Write tests FIRST** (TDD RED phase)
2. **Update migration SQL** (TDD GREEN phase)
3. **Run tests** to verify
4. **Update this README** with new test count
5. **Maintain 90%+ coverage**

## License

MIT License - Sound Forge Alchemy Team

## Authors

- Claude Code (Test Infrastructure Agent)
- Alchemy2 Phase 4: Supabase Migration Tests

---

**Last Updated**: 2025-12-16
**Version**: 1.0.0
**Test Count**: 52 tests across 6 suites
**Coverage Target**: 90%
