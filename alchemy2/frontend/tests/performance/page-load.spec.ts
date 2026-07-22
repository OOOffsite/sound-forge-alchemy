/**
 * Page Load Performance Tests - RED Phase
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define performance targets and will FAIL
 * until optimization work is completed in GREEN phase.
 *
 * Performance Targets:
 * - Page Load: < 2 seconds
 * - First Contentful Paint (FCP): < 1 second
 * - Largest Contentful Paint (LCP): < 2.5 seconds
 * - Time to Interactive (TTI): < 3 seconds
 * - Cumulative Layout Shift (CLS): < 0.1
 * - Time to First Byte (TTFB): < 800ms
 */

import { test, expect } from '@playwright/test';
import {
  measurePageLoad,
  measureFCP,
  measureLCP,
  measureTTI,
  measureCLS,
  measureTTFB,
  collectWebVitals,
  logPerformanceMetrics,
  WEB_VITALS_THRESHOLDS,
} from './helpers';

test.describe('Page Load Performance - RED Phase', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache and cookies before each test
    await page.context().clearCookies();
  });

  test('should load homepage in < 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173', { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;

    console.log(`Homepage load time: ${loadTime}ms`);

    // RED Phase: This will likely FAIL initially
    expect(loadTime).toBeLessThan(2000);
  });

  test('should achieve First Contentful Paint in < 1 second', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'load' });

    const fcp = await measureFCP(page);

    console.log(`First Contentful Paint: ${fcp}ms`);

    // RED Phase: This will likely FAIL initially
    expect(fcp).toBeLessThan(WEB_VITALS_THRESHOLDS.FCP);
    expect(fcp).toBeGreaterThan(0); // Ensure FCP was measured
  });

  test('should achieve Largest Contentful Paint in < 2.5 seconds', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'load' });

    const lcp = await measureLCP(page);

    console.log(`Largest Contentful Paint: ${lcp}ms`);

    // RED Phase: This will likely FAIL initially
    expect(lcp).toBeLessThan(WEB_VITALS_THRESHOLDS.LCP);
    expect(lcp).toBeGreaterThan(0); // Ensure LCP was measured
  });

  test('should achieve Time to Interactive in < 3 seconds', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'load' });

    const tti = await measureTTI(page);

    console.log(`Time to Interactive: ${tti}ms`);

    // RED Phase: This will likely FAIL initially
    expect(tti).toBeLessThan(WEB_VITALS_THRESHOLDS.TTI);
    expect(tti).toBeGreaterThan(0); // Ensure TTI was measured
  });

  test('should have Cumulative Layout Shift < 0.1', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    const cls = await measureCLS(page);

    console.log(`Cumulative Layout Shift: ${cls}`);

    // RED Phase: This will likely FAIL initially
    expect(cls).toBeLessThan(WEB_VITALS_THRESHOLDS.CLS);
  });

  test('should achieve Time to First Byte in < 800ms', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const ttfb = await measureTTFB(page);

    console.log(`Time to First Byte: ${ttfb}ms`);

    // RED Phase: This will likely FAIL initially
    expect(ttfb).toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB);
    expect(ttfb).toBeGreaterThan(0); // Ensure TTFB was measured
  });

  test('should collect and validate all Core Web Vitals', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    const metrics = await collectWebVitals(page);

    logPerformanceMetrics(metrics);

    // RED Phase: Validate all metrics at once
    expect(metrics.pageLoad, 'Page Load').toBeLessThan(2000);
    expect(metrics.fcp, 'FCP').toBeLessThan(WEB_VITALS_THRESHOLDS.FCP);
    expect(metrics.lcp, 'LCP').toBeLessThan(WEB_VITALS_THRESHOLDS.LCP);
    expect(metrics.cls, 'CLS').toBeLessThan(WEB_VITALS_THRESHOLDS.CLS);
    expect(metrics.tti, 'TTI').toBeLessThan(WEB_VITALS_THRESHOLDS.TTI);
    expect(metrics.ttfb, 'TTFB').toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB);
    expect(metrics.memoryMB, 'Memory').toBeLessThan(100);
  });

  test('should load subsequent pages quickly (cached)', async ({ page }) => {
    // First load
    await page.goto('http://localhost:5173', { waitUntil: 'load' });

    // Navigate to another route
    await page.goto('http://localhost:5173/library', { waitUntil: 'load' });

    // Return to homepage (should be faster due to caching)
    const startTime = Date.now();
    await page.goto('http://localhost:5173', { waitUntil: 'load' });
    const cachedLoadTime = Date.now() - startTime;

    console.log(`Cached homepage load time: ${cachedLoadTime}ms`);

    // RED Phase: Cached loads should be even faster
    expect(cachedLoadTime).toBeLessThan(1000); // < 1 second for cached
  });

  test('should handle slow 3G network conditions gracefully', async ({ page, context }) => {
    // Emulate slow 3G
    await page.route('**/*', (route) => {
      // Add artificial delay
      setTimeout(() => route.continue(), 100);
    });

    const startTime = Date.now();
    await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    console.log(`Load time on slow 3G: ${loadTime}ms`);

    // RED Phase: Should still load reasonably on slow connections
    expect(loadTime).toBeLessThan(5000); // < 5 seconds on slow 3G
  });

  test('should render above-the-fold content quickly', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for primary content to be visible
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="main-content"], main, .App', {
      state: 'visible',
      timeout: 2000,
    });
    const renderTime = Date.now() - startTime;

    console.log(`Above-the-fold render time: ${renderTime}ms`);

    // RED Phase: Critical content should render fast
    expect(renderTime).toBeLessThan(1000); // < 1 second
  });
});
