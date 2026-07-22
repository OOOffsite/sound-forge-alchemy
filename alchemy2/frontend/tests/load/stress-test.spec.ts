/**
 * Stress Testing - RED Phase (TDD)
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests push the system beyond normal operating
 * conditions to identify breaking points and validate graceful degradation.
 * Tests will FAIL until proper stress handling is implemented.
 *
 * Stress Test Scenarios:
 * - Peak load: 100 concurrent users (normal * 10)
 * - Extreme load: 500 users (stress test)
 * - Sustained peak: 60 seconds at peak
 * - Resource exhaustion: Memory, CPU, connections
 * - Recovery: System recovery after stress
 *
 * Success Criteria:
 * - No crashes or unrecoverable errors
 * - Graceful degradation (80%+ success under extreme load)
 * - Quick recovery (< 10 seconds after stress)
 * - Resource cleanup (no memory leaks)
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Stress Testing - RED Phase', () => {
  test('should handle peak load (100 concurrent users)', async ({ browser }) => {
    console.log('🔴 RED: Testing peak load (100 concurrent users)...');

    const userCount = 100;

    const startTime = Date.now();

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: userCount }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Simulate realistic user behavior
    const userActions = pages.map(async (page, i) => {
      try {
        await page.goto('http://localhost:5173', { timeout: 15000 });

        // Random actions based on user index
        if (i % 3 === 0) {
          // Download track
          await page.click('[data-testid="download-button"]', { timeout: 5000 })
            .catch(() => console.warn(`User ${i}: Download button not found`));
        } else if (i % 3 === 1) {
          // Browse library
          await page.click('[data-testid="library-link"]', { timeout: 5000 })
            .catch(() => console.warn(`User ${i}: Library link not found`));
        } else {
          // Search tracks
          await page.fill('[data-testid="search-input"]', 'test', { timeout: 5000 })
            .catch(() => console.warn(`User ${i}: Search input not found`));
        }

        return { success: true, userId: i };
      } catch (error) {
        console.warn(`User ${i} failed: ${error}`);
        return { success: false, userId: i };
      }
    });

    const results = await Promise.allSettled(userActions);
    const totalTime = Date.now() - startTime;

    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;

    const successRate = successCount / userCount;

    console.log(`✓ Peak load completed in: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`✓ Successful users: ${successCount}/${userCount}`);

    // RED Phase: Should handle peak within 10 seconds
    expect(totalTime).toBeLessThan(10000);

    // Should handle at least 85% under peak load
    expect(successRate).toBeGreaterThan(0.85);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should gracefully degrade under extreme load (500 users)', async ({ request }) => {
    console.log('🔴 RED: Testing extreme load (500 concurrent users)...');

    const userCount = 500;

    const startTime = Date.now();

    const promises = Array.from({ length: userCount }, (_, i) =>
      request.get('http://localhost:5173', { timeout: 30000 })
        .catch(err => ({ error: true, userId: i }))
    );

    const responses = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.ok && result.value.ok()
    ).length;

    const errorCount = responses.filter(
      result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)
    ).length;

    const successRate = successCount / userCount;

    console.log(`✓ Extreme load completed in: ${totalTime}ms`);
    console.log(`✓ Success: ${successCount}`);
    console.log(`✓ Errors: ${errorCount}`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle at least 80% under extreme load
    expect(successRate).toBeGreaterThan(0.80);

    // Should complete within 30 seconds (graceful degradation, not hang)
    expect(totalTime).toBeLessThan(30000);
  });

  test('should survive sustained peak load (60 seconds)', async ({ browser }) => {
    console.log('🔴 RED: Testing sustained peak load (60 seconds)...');

    const concurrentUsers = 50;
    const duration = 60000; // 60 seconds
    const actionInterval = 2000; // Action every 2 seconds

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: concurrentUsers }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Navigate all pages
    await Promise.all(
      pages.map(page => page.goto('http://localhost:5173'))
    );

    const startTime = Date.now();
    const actionLog: { time: number, success: boolean, userId: number }[] = [];

    // Each user performs repeated actions
    const userWorkloads = pages.map(async (page, userId) => {
      while (Date.now() - startTime < duration) {
        const actionStart = Date.now();

        try {
          // Alternate between different actions
          const action = Math.floor((Date.now() - startTime) / actionInterval) % 3;

          if (action === 0) {
            await page.reload({ timeout: 5000 });
          } else if (action === 1) {
            await page.request.get('http://localhost:3000/api/status');
          } else {
            await page.click('body'); // Interaction
          }

          actionLog.push({ time: actionStart, success: true, userId });
        } catch (error) {
          actionLog.push({ time: actionStart, success: false, userId });
        }

        await new Promise(resolve => setTimeout(resolve, actionInterval));
      }
    });

    await Promise.all(userWorkloads);

    const totalTime = Date.now() - startTime;

    const successCount = actionLog.filter(a => a.success).length;
    const successRate = successCount / actionLog.length;

    // Calculate success rate over time windows
    const windowSize = 10000; // 10-second windows
    const windows = Math.floor(duration / windowSize);
    const windowRates = [];

    for (let w = 0; w < windows; w++) {
      const windowStart = w * windowSize;
      const windowEnd = (w + 1) * windowSize;

      const windowActions = actionLog.filter(
        a => a.time >= startTime + windowStart && a.time < startTime + windowEnd
      );

      const windowSuccess = windowActions.filter(a => a.success).length;
      const windowRate = windowSuccess / windowActions.length;

      windowRates.push(windowRate);
    }

    console.log(`✓ Sustained load duration: ${totalTime}ms`);
    console.log(`✓ Total actions: ${actionLog.length}`);
    console.log(`✓ Overall success rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`✓ Window success rates:`, windowRates.map(r => `${(r * 100).toFixed(0)}%`).join(', '));

    // RED Phase: Should maintain > 85% success rate
    expect(successRate).toBeGreaterThan(0.85);

    // No significant degradation over time (< 10% drop)
    const firstHalf = windowRates.slice(0, Math.floor(windows / 2));
    const secondHalf = windowRates.slice(Math.floor(windows / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const degradation = avgFirst - avgSecond;

    console.log(`✓ Performance degradation: ${(degradation * 100).toFixed(1)}%`);

    expect(degradation).toBeLessThan(0.10);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should recover after load spike', async ({ request }) => {
    console.log('🔴 RED: Testing recovery after load spike...');

    // Phase 1: Baseline performance
    console.log('  Phase 1: Measuring baseline...');
    const baselineStart = Date.now();
    const baselineResponse = await request.get('http://localhost:5173');
    const baselineTime = Date.now() - baselineStart;

    console.log(`  ✓ Baseline response time: ${baselineTime}ms`);

    // Phase 2: Load spike (200 requests simultaneously)
    console.log('  Phase 2: Generating load spike (200 requests)...');
    const spikeRequests = 200;
    const spikeStartTime = Date.now();

    const spikePromises = Array.from({ length: spikeRequests }, () =>
      request.get('http://localhost:5173').catch(err => ({ error: err }))
    );

    await Promise.all(spikePromises);
    const spikeTime = Date.now() - spikeStartTime;

    console.log(`  ✓ Spike completed in: ${spikeTime}ms`);

    // Phase 3: Immediate recovery check
    console.log('  Phase 3: Immediate recovery check...');
    const immediateStart = Date.now();
    const immediateResponse = await request.get('http://localhost:5173');
    const immediateTime = Date.now() - immediateStart;

    console.log(`  ✓ Immediate response time: ${immediateTime}ms`);

    // Phase 4: Wait for full recovery
    console.log('  Phase 4: Waiting 10 seconds for full recovery...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Phase 5: Post-recovery performance
    console.log('  Phase 5: Measuring post-recovery performance...');
    const recoveryStart = Date.now();
    const recoveryResponse = await request.get('http://localhost:5173');
    const recoveryTime = Date.now() - recoveryStart;

    console.log(`  ✓ Post-recovery response time: ${recoveryTime}ms`);

    // RED Phase: Should recover to near-baseline
    expect(baselineResponse.ok()).toBeTruthy();
    expect(immediateResponse.ok()).toBeTruthy();
    expect(recoveryResponse.ok()).toBeTruthy();

    // Recovery time should be within 2x baseline
    expect(recoveryTime).toBeLessThan(baselineTime * 2);
  });

  test('should handle resource exhaustion gracefully', async ({ browser }) => {
    console.log('🔴 RED: Testing resource exhaustion handling...');

    const phases = [
      { users: 50, duration: 5000 },
      { users: 100, duration: 5000 },
      { users: 150, duration: 5000 },
    ];

    const results: { phase: number, users: number, successRate: number, avgTime: number }[] = [];

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
      const phase = phases[phaseIndex];
      console.log(`  Phase ${phaseIndex + 1}: ${phase.users} users for ${phase.duration}ms...`);

      const startTime = Date.now();

      const contexts: BrowserContext[] = await Promise.all(
        Array.from({ length: phase.users }, () => browser.newContext())
      );

      const pages: Page[] = await Promise.all(
        contexts.map(context => context.newPage())
      );

      const actions = pages.map(page =>
        page.goto('http://localhost:5173', { timeout: 10000 })
          .catch(() => ({ error: true }))
      );

      const responses = await Promise.allSettled(actions);
      const phaseTime = Date.now() - startTime;

      const successCount = responses.filter(
        r => r.status === 'fulfilled' && !r.value.error
      ).length;

      const successRate = successCount / phase.users;
      const avgTime = phaseTime / phase.users;

      results.push({ phase: phaseIndex + 1, users: phase.users, successRate, avgTime });

      console.log(`    ✓ Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`    ✓ Avg time: ${avgTime.toFixed(0)}ms`);

      await Promise.all(contexts.map(context => context.close()));

      // Brief pause between phases
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // RED Phase: System should degrade gracefully, not crash
    results.forEach(result => {
      console.log(`Phase ${result.phase}: ${result.users} users, ${(result.successRate * 100).toFixed(1)}% success`);

      // Even under extreme load, should handle > 70%
      expect(result.successRate).toBeGreaterThan(0.70);
    });
  });

  test('should detect and report memory leaks under sustained load', async ({ browser }) => {
    console.log('🔴 RED: Testing for memory leaks...');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:5173');

    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

    // Perform repeated operations
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      // Simulate user actions that might leak
      await page.reload();

      await page.evaluate(() => {
        // Create temporary objects
        const temp = new Array(1000).fill('test');
      });

      if (i % 20 === 0) {
        console.log(`  Iteration ${i}/${iterations}...`);
      }
    }

    // Trigger garbage collection (if available)
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);

    const memoryGrowth = finalMemory - initialMemory;
    const growthPercentage = (memoryGrowth / initialMemory) * 100;

    console.log(`  Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB (${growthPercentage.toFixed(1)}%)`);

    // RED Phase: Memory growth should be reasonable (< 50% increase)
    expect(growthPercentage).toBeLessThan(50);

    await context.close();
  });

  test('should handle cascading failures without total collapse', async ({ request }) => {
    console.log('🔴 RED: Testing cascading failure resilience...');

    // Simulate failure cascade: database → API → frontend

    // Phase 1: Overload database with queries
    console.log('  Phase 1: Overloading database...');
    const dbOverload = 200;

    const dbPromises = Array.from({ length: dbOverload }, () =>
      request.get('http://localhost:3000/api/tracks?limit=100')
    );

    await Promise.allSettled(dbPromises);

    // Phase 2: Test API resilience during db stress
    console.log('  Phase 2: Testing API resilience...');
    const apiTestStart = Date.now();
    const apiResponse = await request.get('http://localhost:3000/api/status');
    const apiTime = Date.now() - apiTestStart;

    console.log(`    ✓ API response time: ${apiTime}ms`);
    console.log(`    ✓ API status: ${apiResponse.ok() ? 'OK' : 'FAILED'}`);

    // Phase 3: Test frontend resilience
    console.log('  Phase 3: Testing frontend resilience...');
    const frontendTestStart = Date.now();
    const frontendResponse = await request.get('http://localhost:5173');
    const frontendTime = Date.now() - frontendTestStart;

    console.log(`    ✓ Frontend response time: ${frontendTime}ms`);
    console.log(`    ✓ Frontend status: ${frontendResponse.ok() ? 'OK' : 'FAILED'}`);

    // RED Phase: System should remain partially functional
    // API health check should work even if db is stressed
    expect(apiResponse.ok()).toBeTruthy();
    expect(apiTime).toBeLessThan(5000); // May be slower, but should respond

    // Frontend should always be accessible
    expect(frontendResponse.ok()).toBeTruthy();
    expect(frontendTime).toBeLessThan(3000);
  });

  test('should maintain critical functionality under extreme stress', async ({ page, request }) => {
    console.log('🔴 RED: Testing critical functionality under stress...');

    // Generate background stress
    const backgroundStress = Array.from({ length: 100 }, () =>
      request.get('http://localhost:3000/api/tracks?limit=50')
    );

    // Don't wait for stress to complete, start testing immediately
    Promise.allSettled(backgroundStress);

    // Test critical paths during stress
    const criticalTests = [
      {
        name: 'Homepage load',
        test: async () => {
          const start = Date.now();
          await page.goto('http://localhost:5173', { timeout: 10000 });
          return { success: await page.locator('body').isVisible(), time: Date.now() - start };
        }
      },
      {
        name: 'API health check',
        test: async () => {
          const start = Date.now();
          const response = await request.get('http://localhost:3000/api/status');
          return { success: response.ok(), time: Date.now() - start };
        }
      },
      {
        name: 'User authentication check',
        test: async () => {
          const start = Date.now();
          const response = await request.get('http://localhost:3000/api/auth/session');
          return { success: response.status() !== 500, time: Date.now() - start };
        }
      }
    ];

    const results = [];

    for (const test of criticalTests) {
      try {
        const result = await test.test();
        results.push({ ...test, ...result });
        console.log(`  ✓ ${test.name}: ${result.success ? 'PASS' : 'FAIL'} (${result.time}ms)`);
      } catch (error) {
        results.push({ ...test, success: false, time: 0 });
        console.log(`  ✗ ${test.name}: ERROR`);
      }
    }

    // Wait for background stress to complete
    await Promise.allSettled(backgroundStress);

    // RED Phase: Critical functionality must work under stress
    const allPassed = results.every(r => r.success);

    console.log(`\n  Critical tests passed: ${results.filter(r => r.success).length}/${results.length}`);

    expect(allPassed).toBeTruthy();
  });
});
