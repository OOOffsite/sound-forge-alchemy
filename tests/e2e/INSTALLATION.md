# E2E Tests Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install all npm dependencies including Playwright
npm install

# Install Playwright browsers and system dependencies
npm run playwright:install
```

### 2. Add Test Fixtures

Create the following audio files in `tests/fixtures/`:

#### Required Files:
- **test-audio.mp3** - Primary test file (30-60 seconds, MP3, 128-320 kbps)
- **test-audio-2.mp3** - Secondary test file
- **test-audio-3.mp3** - Tertiary test file
- **corrupted-audio.mp3** - Corrupted MP3 for error testing
- **test-document.pdf** - PDF file for format validation

You can use any audio files you have, or download free test audio from:
- https://freesound.org/
- https://incompetech.com/
- https://www.bensound.com/

### 3. Verify Installation

```bash
# Check Playwright is installed
npx playwright --version

# List available browsers
npx playwright install --dry-run
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug
```

### Browser-Specific Tests

```bash
# Run only in Chromium
npm run test:e2e:chromium

# Run only in Firefox
npm run test:e2e:firefox

# Run only in WebKit
npm run test:e2e:webkit
```

### Specific Test Files

```bash
# Run specific test file
npx playwright test tests/e2e/download-workflow.spec.ts

# Run specific test by name
npx playwright test -g "should complete full download flow"
```

### View Results

```bash
# Open HTML report
npm run test:e2e:report
```

## Expected Results (RED Phase)

**ALL TESTS SHOULD FAIL** - This is expected!

The tests were written BEFORE implementation (TDD methodology). They will pass as features are implemented.

Example expected failures:
```
✘ should complete full download flow
  Error: Locator not found: [data-testid="spotify-url-input"]

✘ should separate stems from uploaded audio
  Error: Navigation timeout waiting for /processing

✘ should analyze audio and display features
  Error: Element not found: [data-testid="analyze-button"]
```

## Development Workflow

### TDD Process

1. **RED Phase** (Current)
   - ✅ All tests written
   - ❌ All tests failing (expected)

2. **GREEN Phase** (Next)
   ```bash
   # Implement a feature
   # Run specific test
   npx playwright test tests/e2e/download-workflow.spec.ts

   # Watch for failures
   # Fix implementation
   # Re-run test
   # Repeat until passing
   ```

3. **REFACTOR Phase**
   ```bash
   # Optimize code
   # Run all tests to ensure still passing
   npm run test:e2e
   ```

### Continuous Testing

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Run tests in watch mode (not built-in, use UI mode)
npm run test:e2e:ui
```

## Troubleshooting

### Issue: Playwright not found

```bash
# Reinstall Playwright
npm install --save-dev @playwright/test
npm run playwright:install
```

### Issue: Browser installation fails

```bash
# Install with system dependencies
npx playwright install --with-deps chromium

# Or install all browsers
npx playwright install --with-deps
```

### Issue: Tests timeout

```bash
# Increase timeout in playwright.config.ts
# Or run with custom timeout
npx playwright test --timeout=180000
```

### Issue: Dev server not starting

```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process if needed
kill -9 <PID>

# Or change port in vite.config.ts and playwright.config.ts
```

### Issue: Test fixtures not found

```bash
# Verify files exist
ls -la tests/fixtures/

# Check file paths in tests match actual file names
```

## Advanced Usage

### Record New Tests

```bash
# Open Playwright test generator
npm run test:e2e:codegen

# This will:
# 1. Open browser
# 2. Navigate to http://localhost:5173
# 3. Record your actions
# 4. Generate test code
```

### Debug Specific Test

```bash
# Debug single test
npx playwright test --debug -g "should complete full download flow"

# This opens Playwright Inspector for step-by-step debugging
```

### Run Tests in Parallel

```bash
# Run with specific number of workers
npx playwright test --workers=4

# Run in fully parallel mode
npx playwright test --fully-parallel
```

### Generate Screenshots

```bash
# Take screenshot on every step (slow!)
npx playwright test --screenshot=on

# Screenshots on failure only (default)
npx playwright test --screenshot=only-on-failure
```

### Generate Videos

```bash
# Record video for every test
npx playwright test --video=on

# Videos on failure only
npx playwright test --video=retain-on-failure
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Configuration

### Playwright Config Location
`/Users/jeremiah/Developer/sound-forge-alchemy/playwright.config.ts`

### Key Settings
- **Test Directory**: `./tests/e2e`
- **Timeout**: 120 seconds per test
- **Retries**: 2 (CI only)
- **Workers**: 4 (parallel execution)
- **Base URL**: http://localhost:5173

### Customize Settings

Edit `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 180000,        // Increase timeout to 3 minutes
  workers: 2,             // Reduce parallel workers
  retries: 1,             // Always retry once
  // ... other settings
});
```

## Environment Variables

### Optional Environment Variables

```bash
# Set base URL
export PLAYWRIGHT_BASE_URL=http://localhost:3000

# Enable debug mode
export DEBUG=pw:api

# Set test timeout
export PLAYWRIGHT_TIMEOUT=300000
```

## Test Coverage

### Check Coverage

After implementation is complete:

```bash
# Run tests with coverage
npm run test:e2e

# View coverage report
npm run test:e2e:report
```

### Coverage Target
- **Goal**: 85% E2E coverage
- **Current**: 0% (implementation pending)

## Support

### Documentation
- Playwright Docs: https://playwright.dev/
- Test-Driven Development: https://en.wikipedia.org/wiki/Test-driven_development

### Test Files Location
- Tests: `/Users/jeremiah/Developer/sound-forge-alchemy/tests/e2e/`
- Helpers: `/Users/jeremiah/Developer/sound-forge-alchemy/tests/e2e/helpers/`
- Fixtures: `/Users/jeremiah/Developer/sound-forge-alchemy/tests/fixtures/`

### Checkpoints
- Location: `/Users/jeremiah/Developer/sound-forge-alchemy/.claude/checkpoints/tdd/`
- Format: JSON
- Track: Phase, tests written, dependencies, next steps

## Next Steps

1. ✅ Install Playwright: `npm run playwright:install`
2. ✅ Add test fixtures to `tests/fixtures/`
3. ✅ Run tests: `npm run test:e2e`
4. ✅ Verify all tests fail (expected in RED phase)
5. 🚧 Begin GREEN phase: Implement features to make tests pass
6. 🚧 Run tests continuously as features are implemented
7. 🚧 Achieve 85%+ coverage
8. 🚧 Enter REFACTOR phase: Optimize while keeping tests green

---

**Installation Guide Version**: 1.0.0
**Last Updated**: 2025-12-16
**TDD Phase**: RED (Tests written, implementation pending)
