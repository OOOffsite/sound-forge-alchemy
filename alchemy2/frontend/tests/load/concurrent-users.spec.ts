/**
 * Concurrent User Load Tests - RED Phase (TDD)
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define load targets and will FAIL
 * until system optimization is completed in GREEN phase.
 *
 * Load Targets:
 * - 10 concurrent users: < 5 seconds
 * - 50 concurrent downloads: < 10 seconds
 * - 20 concurrent stem separations: < 5 seconds (queuing)
 *
 * Test Strategy:
 * 1. Write failing tests that define load requirements
 * 2. Implement optimizations to pass tests
 * 3. Refactor for efficiency while maintaining performance
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Concurrent User Load - RED Phase', () => {
  test('should handle 10 concurrent users loading homepage', async ({ browser }) => {
    console.log('🔴 RED: Testing 10 concurrent user homepage loads...');

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const startTime = Date.now();

    // All users navigate to homepage simultaneously
    const navigationPromises = pages.map(page =>
      page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 10000 })
    );

    await Promise.all(navigationPromises);

    const loadTime = Date.now() - startTime;

    console.log(`✓ All 10 users loaded homepage in: ${loadTime}ms`);

    // RED Phase: This should FAIL until optimizations are made
    expect(loadTime).toBeLessThan(5000);

    // Verify all pages loaded successfully
    for (const page of pages) {
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBeTruthy();
    }

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle 50 concurrent download requests', async ({ browser }) => {
    console.log('🔴 RED: Testing 50 concurrent download requests...');

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: 50 }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Navigate all pages first
    await Promise.all(
      pages.map(page => page.goto('http://localhost:5173'))
    );

    const startTime = Date.now();

    // All users initiate download simultaneously
    const downloadPromises = pages.map((page, i) =>
      page.request.post('http://localhost:3000/api/download/track', {
        data: {
          trackId: `test-track-${i}`,
          url: `https://open.spotify.com/track/test-${i}`,
          format: 'mp3'
        },
        timeout: 15000
      })
    );

    const responses = await Promise.allSettled(downloadPromises);

    const totalTime = Date.now() - startTime;

    console.log(`✓ 50 concurrent downloads completed in: ${totalTime}ms`);

    // RED Phase: Should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000);

    // Count successful responses
    const successCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.ok()
    ).length;

    const successRate = successCount / 50;

    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // Verify at least 90% success rate
    expect(successRate).toBeGreaterThan(0.90);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle 20 concurrent stem separation requests', async ({ browser }) => {
    console.log('🔴 RED: Testing 20 concurrent stem separation requests...');

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: 20 }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    await Promise.all(
      pages.map(page => page.goto('http://localhost:5173'))
    );

    const startTime = Date.now();

    // All users request stem separation simultaneously
    const processingPromises = pages.map((page, i) =>
      page.request.post('http://localhost:3000/api/processing/separate', {
        data: {
          trackId: `test-track-${i}`,
          audioFilePath: `/test/audio-${i}.mp3`,
          model: 'htdemucs',
          stems: ['vocals', 'drums', 'bass', 'other']
        },
        timeout: 10000
      })
    );

    const responses = await Promise.allSettled(processingPromises);

    const totalTime = Date.now() - startTime;

    console.log(`✓ 20 concurrent processing requests queued in: ${totalTime}ms`);

    // RED Phase: All should be queued within 5 seconds
    expect(totalTime).toBeLessThan(5000);

    const successCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.ok()
    ).length;

    const successRate = successCount / 20;

    console.log(`✓ Queuing success rate: ${(successRate * 100).toFixed(1)}%`);

    // Verify all requests were accepted/queued (may return 202 Accepted)
    expect(successRate).toBeGreaterThan(0.95);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle concurrent users with mixed actions', async ({ browser }) => {
    console.log('🔴 RED: Testing mixed concurrent user actions...');

    const userCount = 30;
    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: userCount }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const startTime = Date.now();

    // Simulate realistic user behavior
    const actionPromises = pages.map(async (page, i) => {
      await page.goto('http://localhost:5173');

      // Different actions based on user index
      if (i % 3 === 0) {
        // Browse library
        try {
          await page.click('[data-testid="library-link"]', { timeout: 3000 });
        } catch (e) {
          console.warn(`User ${i}: Library link not found`);
        }
      } else if (i % 3 === 1) {
        // Start download
        await page.request.post('http://localhost:3000/api/download/track', {
          data: { trackId: `track-${i}` }
        }).catch(() => {});
      } else {
        // Check status
        await page.request.get(`http://localhost:3000/api/status`).catch(() => {});
      }
    });

    await Promise.allSettled(actionPromises);

    const totalTime = Date.now() - startTime;

    console.log(`✓ ${userCount} concurrent mixed actions completed in: ${totalTime}ms`);

    // RED Phase: Should handle within 8 seconds
    expect(totalTime).toBeLessThan(8000);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should maintain performance under sustained load (30 seconds)', async ({ browser }) => {
    console.log('🔴 RED: Testing sustained load over 30 seconds...');

    const concurrentUsers = 5;
    const duration = 30000; // 30 seconds
    const requestInterval = 1000; // 1 request per second per user

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: concurrentUsers }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    await Promise.all(
      pages.map(page => page.goto('http://localhost:5173'))
    );

    const startTime = Date.now();
    const responseTimes: number[] = [];
    const errors: number[] = [];

    // Each user makes repeated requests
    const userWorkloads = pages.map(async (page, userIndex) => {
      while (Date.now() - startTime < duration) {
        const reqStart = Date.now();

        try {
          const response = await page.request.get('http://localhost:3000/api/status');
          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);

          if (!response.ok()) {
            errors.push(userIndex);
          }
        } catch (e) {
          errors.push(userIndex);
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
    });

    await Promise.all(userWorkloads);

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorRate = errors.length / responseTimes.length;

    console.log(`✓ Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`✓ Error rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`✓ Total requests: ${responseTimes.length}`);

    // RED Phase: Performance targets
    expect(avgResponseTime).toBeLessThan(500); // < 500ms average
    expect(errorRate).toBeLessThan(0.01); // < 1% errors

    await Promise.all(contexts.map(context => context.close()));
  });
});
