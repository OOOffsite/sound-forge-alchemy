# Docker Infrastructure Tests - Quick Start Guide

## Prerequisites

1. **Docker** must be installed and running
2. **Node.js** 20+ installed
3. **npm** installed

## Installation

```bash
# Install dependencies (including yaml package)
npm install

# Make test runner executable
chmod +x tests/infrastructure/run-tests.sh
```

## Running Tests

### Method 1: Using npm scripts (Recommended)

```bash
# Run all Docker tests
npm run test:docker

# Run with automated test runner (creates checkpoints)
npm run test:docker:runner

# Run with coverage report
npm run test:docker:coverage

# Run in watch mode (auto-rerun on file changes)
npm run test:docker:watch

# Run with interactive UI
npm run test:docker:ui
```

### Method 2: Run specific test suites

```bash
# Frontend tests only
npm run test:docker tests/infrastructure/docker/frontend.test.ts

# Backend tests only
npm run test:docker tests/infrastructure/docker/backend.test.ts

# Docker Compose tests only
npm run test:docker tests/infrastructure/docker/compose.test.ts

# Performance tests only (slow, ~30+ minutes)
npm run test:docker tests/infrastructure/docker/performance.test.ts
```

### Method 3: Direct test runner

```bash
# Run with bash script (creates detailed checkpoints)
bash tests/infrastructure/run-tests.sh

# Include performance tests (add env var)
RUN_PERFORMANCE_TESTS=true bash tests/infrastructure/run-tests.sh
```

## Expected Behavior (RED Phase)

**IMPORTANT:** These tests are in the TDD RED phase, meaning they are **expected to fail**. This is correct and intentional!

The tests establish:
- Clear requirements for Docker configurations
- Performance targets
- Security requirements
- Best practices

After the GREEN phase (fixing configurations), all tests should pass.

## Test Suites Overview

| Suite | Tests | Focus | Runtime |
|-------|-------|-------|---------|
| Frontend | 20+ | React/Vite Docker build | ~3-5 min |
| Backend | 50+ | 6 backend services | ~10-15 min |
| Compose | 60+ | docker-compose.yml config | ~30 sec |
| Performance | 25+ | Build speed & optimization | ~30+ min |

**Total:** 155+ tests

## Quick Troubleshooting

### Docker not running
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker info
```

### Permission denied on test runner
```bash
chmod +x tests/infrastructure/run-tests.sh
```

### Tests timeout
```bash
# Performance tests can take long time
# Use smaller test suites first
npm run test:docker tests/infrastructure/docker/compose.test.ts
```

### YAML import errors
```bash
# Ensure yaml package is installed
npm install yaml
```

## Understanding Test Results

### RED Phase (Current)
- ❌ Tests fail
- This is **expected and correct**
- Establishes requirements

### GREEN Phase (Next)
- Fix Docker configurations
- ✅ Tests pass
- Minimum code to pass

### REFACTOR Phase (Final)
- Optimize configurations
- ✅ Tests stay green
- Improved performance

## Checkpoints

Test results are saved to:
```
.claude/checkpoints/tdd/
├── docker-tdd-frontend.json
├── docker-tdd-backend.json
├── docker-tdd-compose.json
├── docker-tdd-performance.json
└── docker-tdd-report.md (this comprehensive report)
```

## Performance Targets

| Service | First Build | Cached Build | Max Size |
|---------|-------------|--------------|----------|
| Frontend | < 3 min | < 30 sec | < 150 MB |
| Backend (Node) | < 2 min | < 30 sec | < 200 MB |
| Hybrid (Py+Node) | < 5 min | < 1 min | < 400 MB |
| Processing | < 5 min | < 1 min | < 600 MB |

## Next Steps

1. **Run compose tests first** (fastest validation)
   ```bash
   npm run test:docker tests/infrastructure/docker/compose.test.ts
   ```

2. **Review failures** and understand requirements

3. **Fix configurations** (GREEN phase)
   - Update Dockerfiles
   - Optimize docker-compose.yml
   - Add .dockerignore

4. **Re-run tests** until all pass
   ```bash
   npm run test:docker:coverage
   ```

5. **Optimize further** (REFACTOR phase)
   - Reduce image sizes
   - Improve build times
   - Document changes

## Getting Help

- **Full documentation:** See `tests/infrastructure/docker/README.md`
- **Detailed report:** See `.claude/checkpoints/tdd/docker-tdd-report.md`
- **Test helpers:** See `tests/infrastructure/helpers/docker.ts`

## TDD Workflow

```
RED Phase (Current)
    ↓
Write failing tests ✅
    ↓
Tests fail (expected) ❌
    ↓
GREEN Phase (Next)
    ↓
Fix code to pass tests
    ↓
Tests pass ✅
    ↓
REFACTOR Phase (Final)
    ↓
Optimize while tests stay green ✅
```

---

**Happy Testing!** 🐳
