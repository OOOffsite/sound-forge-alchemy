# Alchemy2 Performance Tests - TDD RED Phase

**Author**: Claude Code
**License**: MIT
**Version**: 2.0.0
**TDD Phase**: RED (Tests Written, Optimization Pending)

## Overview

This directory contains comprehensive performance tests for the Alchemy2 frontend application, implementing a Test-Driven Development (TDD) approach to performance optimization.

## TDD Methodology

### RED Phase (Current)
- **Status**: Tests written and will FAIL
- **Purpose**: Define performance targets and establish baseline
- **Action**: Run tests to identify performance bottlenecks

### GREEN Phase (Next)
- **Status**: Pending
- **Purpose**: Optimize application to pass all tests
- **Action**: Implement performance improvements

### REFACTOR Phase (Future)
- **Status**: Pending
- **Purpose**: Further optimize while maintaining passing tests
- **Action**: Continuous improvement

## Test Suites

### 1. Page Load Performance (`page-load.spec.ts`)

**Tests**: 10 tests covering Core Web Vitals and load times

**Performance Targets**:
- Page Load: < 2 seconds
- First Contentful Paint (FCP): < 1 second
- Largest Contentful Paint (LCP): < 2.5 seconds
- Time to Interactive (TTI): < 3 seconds
- Cumulative Layout Shift (CLS): < 0.1
- Time to First Byte (TTFB): < 800ms
- Cached Load: < 1 second
- Slow 3G Load: < 5 seconds
- Above-the-fold Content: < 1 second

**Coverage**: Core Web Vitals, network conditions, caching

### 2. API Response Times (`api-response-times.spec.ts`)

**Tests**: 10 tests covering all API endpoints

**Performance Targets**:
- Spotify Fetch API: < 500ms
- Download Track (job creation): < 200ms
- Job Status Query: < 100ms
- Processing Separation: < 300ms
- Analysis Creation: < 250ms
- Concurrent Requests: < 1 second total (5 requests)
- Error Responses: < 300ms
- Rate Limiting: < 100ms response
- Load Test: < 120ms average (20 requests)
- WebSocket Connection: < 1 second

**Coverage**: All backend API endpoints, concurrency, error handling

### 3. Component Render Performance (`component-render.spec.ts`)

**Tests**: 10 tests covering component rendering and updates

**Performance Targets**:
- AudioPlayer: < 100ms render
- TrackLibrary (100 tracks): < 500ms render
- JobProgress Update: < 50ms
- TrackCard: < 30ms render
- Waveform: < 200ms render
- Re-render Average: < 50ms
- Re-render Max: < 100ms
- Virtualization: Max 3x visible items in DOM
- Lazy Images: > 50% lazy loaded
- Search Debounce: > 400ms wait
- Modal Open/Close: < 100ms each

**Coverage**: React components, re-renders, virtualization, optimization patterns

### 4. Bundle Size (`bundle-size.spec.ts`)

**Tests**: 10 tests covering bundle optimization

**Performance Targets**:
- Main JavaScript (gzipped): < 500KB
- Main CSS (gzipped): < 50KB
- Total JS Files: < 20 files
- Lazy Loading: Additional chunks on navigation
- Caching Headers: > 80% with proper headers
- Minification: Avg line > 100 chars in production
- Image Optimization: < 20% large images (>500KB)
- Tree Shaking: 0 unused libraries
- Code Splitting: > 0 routes with chunks
- Compression: > 80% compressed in production

**Coverage**: Bundle optimization, code splitting, asset optimization

### 5. Memory Usage (`memory-usage.spec.ts`)

**Tests**: 10 tests covering memory leaks and resource cleanup

**Performance Targets**:
- Initial Load: < 100MB
- Navigation Cycles: < 20% increase after 10 cycles
- Audio Cleanup: < 50% audio elements remaining
- Event Listeners: < 2x accumulation
- WebSocket Cleanup: <= 1 connection
- Large Data: < 50MB increase, < 150MB total
- Repeated Renders: No leak detected
- DOM Nodes: < 1.5x accumulation
- Timer Cleanup: < 3x timeouts, < 2x intervals

**Coverage**: Memory leaks, resource cleanup, DOM management

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Performance Tests

```bash
npm run test:perf
```

### Run Specific Suite

```bash
npx playwright test tests/performance/page-load.spec.ts
npx playwright test tests/performance/api-response-times.spec.ts
npx playwright test tests/performance/component-render.spec.ts
npx playwright test tests/performance/bundle-size.spec.ts
npx playwright test tests/performance/memory-usage.spec.ts
```

### View Performance Report

```bash
npm run test:perf:report
```

## Test Infrastructure

### Configuration
- **File**: `playwright.performance.config.ts`
- **Workers**: 1 (sequential execution)
- **Retries**: 0 (no retries for consistent metrics)
- **Timeout**: 60 seconds per test
- **Reporter**: HTML, JSON, List

### Helpers
- **File**: `tests/performance/helpers.ts`
- **Functions**:
  - `measureFCP()` - First Contentful Paint
  - `measureLCP()` - Largest Contentful Paint
  - `measureCLS()` - Cumulative Layout Shift
  - `measureTTI()` - Time to Interactive
  - `measureTTFB()` - Time to First Byte
  - `measurePageLoad()` - Total page load time
  - `measureAPIResponse()` - API response time
  - `getMemoryUsage()` - JS heap memory
  - `detectMemoryLeak()` - Memory leak detection
  - `getBundleSize()` - Resource size
  - `collectWebVitals()` - All Core Web Vitals

## Checkpoints

TDD checkpoints are stored in `.claude/checkpoints/tdd/`:

- `performance-tdd-page-load.json` - Page load phase tracking
- `performance-tdd-api-response.json` - API response phase tracking
- `performance-tdd-component-render.json` - Component render phase tracking
- `performance-tdd-bundle-size.json` - Bundle size phase tracking
- `performance-tdd-memory-usage.json` - Memory usage phase tracking

Each checkpoint includes:
- Current phase (RED/GREEN/REFACTOR)
- Tests written count
- Performance targets
- Coverage metrics
- Next actions

## Coverage Target

**Target**: 85% minimum performance test coverage

**Current**: 0% (RED phase - tests not yet run)

## Next Steps (GREEN Phase)

### Page Load Optimization
1. Run tests to establish baseline
2. Optimize bundle splitting
3. Implement lazy loading
4. Add preloading for critical resources
5. Optimize images and assets
6. Implement service worker caching

### API Optimization
1. Run tests to establish baseline
2. Add database indexing
3. Implement API response caching
4. Optimize database queries
5. Add connection pooling
6. Implement request batching
7. Add API rate limiting

### Component Optimization
1. Run tests to establish baseline
2. Implement React.memo for expensive components
3. Add virtualization for long lists
4. Implement lazy loading for images
5. Add debouncing for search inputs
6. Optimize re-render cycles
7. Use useMemo and useCallback hooks

### Bundle Optimization
1. Run tests to establish baseline
2. Configure Vite for optimal code splitting
3. Implement lazy loading for routes
4. Add tree shaking configuration
5. Optimize images with WebP/AVIF
6. Enable compression (Brotli/Gzip)
7. Add proper caching headers

### Memory Optimization
1. Run tests to establish baseline
2. Add cleanup in useEffect return functions
3. Implement proper WebSocket cleanup
4. Add audio element disposal
5. Clear timers and intervals on unmount
6. Remove event listeners on cleanup
7. Implement memory profiling

## Performance Metrics Dashboard

After running tests, performance metrics will be available in:

- **HTML Report**: `performance-report/index.html`
- **JSON Results**: `performance-results.json`
- **Console Output**: Real-time metrics during test execution

## CI/CD Integration

To run performance tests in CI/CD:

```yaml
- name: Run Performance Tests
  run: npm run test:perf
  env:
    CI: true
```

## Browser Configuration

Tests run on:
- **Browser**: Chromium (Desktop Chrome profile)
- **Launch Options**:
  - `--enable-precise-memory-info`
  - `--enable-gpu-benchmarking`
  - `--enable-performance-navigation-timing`

## Important Notes

1. **RED Phase**: All tests are expected to FAIL initially
2. **Sequential Execution**: Tests run sequentially for accurate measurements
3. **No Retries**: Ensures consistent performance metrics
4. **Real Conditions**: Tests simulate real-world network and device conditions
5. **Baseline First**: Always establish baseline before optimization

## Success Criteria

Performance tests are considered successful when:

- All 50 tests pass
- Core Web Vitals meet targets
- API response times under thresholds
- No memory leaks detected
- Bundle sizes optimized
- 85%+ performance coverage achieved

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Playwright Performance Testing](https://playwright.dev/docs/test-performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React Performance Optimization](https://react.dev/reference/react/memo)

---

**Generated with Claude Code** | MIT License | TDD Methodology
