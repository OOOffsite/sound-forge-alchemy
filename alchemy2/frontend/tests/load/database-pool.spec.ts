/**
 * Database Connection Pool Load Tests - RED Phase (TDD)
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests validate database connection pool behavior
 * under high concurrency and will FAIL until proper pool configuration
 * is implemented in GREEN phase.
 *
 * Pool Targets:
 * - 100 concurrent queries: < 3 seconds
 * - Sustained load (30s): < 1% error rate
 * - Connection pool: No exhaustion under normal load
 * - Query performance: < 100ms average
 *
 * Test Strategy:
 * 1. Test concurrent query handling
 * 2. Test sustained load without exhaustion
 * 3. Test connection reuse and recycling
 * 4. Test pool limits and overflow behavior
 */

import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Database Connection Pool - RED Phase', () => {
  test('should handle 100 concurrent database queries', async ({ request }) => {
    console.log('🔴 RED: Testing 100 concurrent database queries...');

    const concurrentQueries = 100;

    const promises = Array.from({ length: concurrentQueries }, (_, i) =>
      request.get(`http://localhost:3000/api/tracks?page=${i % 10}&limit=20`)
    );

    const startTime = Date.now();
    const responses = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.ok()
    ).length;

    const successRate = successCount / concurrentQueries;

    console.log(`✓ Completed in: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Should complete within 3 seconds
    expect(totalTime).toBeLessThan(3000);

    // All should succeed (no pool exhaustion)
    expect(successRate).toBeGreaterThan(0.99);
  });

  test('should not exhaust connection pool under sustained load', async ({ request }) => {
    console.log('🔴 RED: Testing sustained load (30 seconds)...');

    const duration = 30000; // 30 seconds
    const requestInterval = 100; // 10 requests/second
    const startTime = Date.now();

    let successCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    while (Date.now() - startTime < duration) {
      const reqStart = Date.now();

      try {
        const response = await request.get('http://localhost:3000/api/tracks?limit=10');
        const reqTime = Date.now() - reqStart;

        responseTimes.push(reqTime);

        if (response.ok()) {
          successCount++;
        } else {
          errorCount++;
          console.warn(`Request failed with status: ${response.status()}`);
        }
      } catch (error) {
        errorCount++;
        console.warn(`Request error: ${error}`);
      }

      await new Promise(resolve => setTimeout(resolve, requestInterval));
    }

    const totalRequests = successCount + errorCount;
    const errorRate = errorCount / totalRequests;
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    console.log(`✓ Total requests: ${totalRequests}`);
    console.log(`✓ Success count: ${successCount}`);
    console.log(`✓ Error count: ${errorCount}`);
    console.log(`✓ Error rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`✓ Avg response time: ${avgResponseTime.toFixed(0)}ms`);

    // RED Phase: Error rate should be < 1%
    expect(errorRate).toBeLessThan(0.01);

    // Response time should remain consistent
    expect(avgResponseTime).toBeLessThan(500);
  });

  test('should handle concurrent writes without deadlocks', async ({ request }) => {
    console.log('🔴 RED: Testing concurrent write operations...');

    const concurrentWrites = 50;

    const promises = Array.from({ length: concurrentWrites }, (_, i) =>
      request.post('http://localhost:3000/api/tracks', {
        data: {
          title: `Test Track ${i}`,
          artist: `Test Artist ${i}`,
          spotifyUrl: `https://open.spotify.com/track/test-${i}`,
          duration: 180000
        }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successCount = responses.filter(
      result => result.status === 'fulfilled' && (result.value.ok() || result.value.status() === 201)
    ).length;

    const successRate = successCount / concurrentWrites;

    console.log(`✓ Completed in: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: No deadlocks or timeouts
    expect(totalTime).toBeLessThan(5000);
    expect(successRate).toBeGreaterThan(0.95);
  });

  test('should efficiently reuse connections', async ({ request }) => {
    console.log('🔴 RED: Testing connection reuse efficiency...');

    const iterations = 100;
    const connectionReuseSamples: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await request.get('http://localhost:3000/api/status');
      const responseTime = Date.now() - startTime;

      connectionReuseSamples.push(responseTime);
    }

    const avgResponseTime = connectionReuseSamples.reduce((a, b) => a + b, 0) / iterations;
    const firstTen = connectionReuseSamples.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const lastTen = connectionReuseSamples.slice(-10).reduce((a, b) => a + b, 0) / 10;

    console.log(`✓ Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`✓ First 10 avg: ${firstTen.toFixed(0)}ms`);
    console.log(`✓ Last 10 avg: ${lastTen.toFixed(0)}ms`);

    // RED Phase: Connection reuse should improve performance
    expect(avgResponseTime).toBeLessThan(100);

    // Last requests should be as fast or faster (connection warming)
    expect(lastTen).toBeLessThanOrEqual(firstTen * 1.2); // Allow 20% variance
  });

  test('should handle mixed read/write workload', async ({ request }) => {
    console.log('🔴 RED: Testing mixed read/write workload...');

    const duration = 20000; // 20 seconds
    const startTime = Date.now();

    const readPromises: Promise<any>[] = [];
    const writePromises: Promise<any>[] = [];

    let readCount = 0;
    let writeCount = 0;

    while (Date.now() - startTime < duration) {
      // 70% reads, 30% writes
      if (Math.random() < 0.7) {
        readCount++;
        readPromises.push(
          request.get('http://localhost:3000/api/tracks?limit=20').catch(err => ({ error: err }))
        );
      } else {
        writeCount++;
        writePromises.push(
          request.post('http://localhost:3000/api/tracks', {
            data: {
              title: `Mixed Test ${writeCount}`,
              artist: 'Test Artist',
              spotifyUrl: `https://open.spotify.com/track/mixed-${writeCount}`
            }
          }).catch(err => ({ error: err }))
        );
      }

      await new Promise(resolve => setTimeout(resolve, 50)); // 20 ops/second
    }

    const [readResults, writeResults] = await Promise.all([
      Promise.allSettled(readPromises),
      Promise.allSettled(writePromises)
    ]);

    const totalTime = Date.now() - startTime;

    const readSuccess = readResults.filter(
      r => r.status === 'fulfilled' && r.value.ok && r.value.ok()
    ).length;

    const writeSuccess = writeResults.filter(
      r => r.status === 'fulfilled' && r.value.ok && r.value.ok()
    ).length;

    const readSuccessRate = readSuccess / readCount;
    const writeSuccessRate = writeSuccess / writeCount;

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Reads: ${readCount} (${(readSuccessRate * 100).toFixed(1)}% success)`);
    console.log(`✓ Writes: ${writeCount} (${(writeSuccessRate * 100).toFixed(1)}% success)`);

    // RED Phase: Mixed workload should succeed
    expect(readSuccessRate).toBeGreaterThan(0.95);
    expect(writeSuccessRate).toBeGreaterThan(0.90);
  });

  test('should gracefully handle pool exhaustion', async ({ request }) => {
    console.log('🔴 RED: Testing pool exhaustion behavior...');

    // Attempt to exhaust pool with many slow queries
    const overload = 200; // More than typical pool size

    const promises = Array.from({ length: overload }, (_, i) =>
      request.get(`http://localhost:3000/api/tracks?limit=100&page=${i}`)
        .catch(err => ({ error: err, index: i }))
    );

    const startTime = Date.now();
    const responses = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    const successCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.ok && result.value.ok()
    ).length;

    const errorCount = responses.filter(
      result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)
    ).length;

    const timeoutCount = responses.filter(
      result => result.status === 'fulfilled' && result.value.status && result.value.status() === 504
    ).length;

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Success: ${successCount}`);
    console.log(`✓ Errors: ${errorCount}`);
    console.log(`✓ Timeouts: ${timeoutCount}`);

    // RED Phase: Should handle gracefully (not crash)
    // Some requests may fail, but system should respond
    expect(successCount).toBeGreaterThan(0);

    // Should complete within reasonable time (not hang indefinitely)
    expect(totalTime).toBeLessThan(30000); // 30 seconds max
  });

  test('should maintain query performance under concurrent load', async ({ request }) => {
    console.log('🔴 RED: Testing query performance under concurrent load...');

    const concurrentUsers = 20;
    const queriesPerUser = 10;

    const userWorkloads = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const queryTimes: number[] = [];

      for (let i = 0; i < queriesPerUser; i++) {
        const startTime = Date.now();

        try {
          const response = await request.get(
            `http://localhost:3000/api/tracks?search=test&page=${i}&limit=20`
          );

          const queryTime = Date.now() - startTime;

          if (response.ok()) {
            queryTimes.push(queryTime);
          }
        } catch (error) {
          console.warn(`User ${userIndex} query ${i} failed`);
        }
      }

      return queryTimes;
    });

    const startTime = Date.now();
    const results = await Promise.all(userWorkloads);
    const totalTime = Date.now() - startTime;

    const allQueryTimes = results.flat();
    const avgQueryTime = allQueryTimes.reduce((a, b) => a + b, 0) / allQueryTimes.length;
    const maxQueryTime = Math.max(...allQueryTimes);
    const minQueryTime = Math.min(...allQueryTimes);

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Total queries: ${allQueryTimes.length}`);
    console.log(`✓ Avg query time: ${avgQueryTime.toFixed(0)}ms`);
    console.log(`✓ Min query time: ${minQueryTime}ms`);
    console.log(`✓ Max query time: ${maxQueryTime}ms`);

    // RED Phase: Query performance targets
    expect(avgQueryTime).toBeLessThan(500); // < 500ms average
    expect(maxQueryTime).toBeLessThan(2000); // No query > 2 seconds
    expect(allQueryTimes.length).toBeGreaterThan(concurrentUsers * queriesPerUser * 0.95); // > 95% success
  });

  test('should handle connection pool growth and shrinkage', async ({ request }) => {
    console.log('🔴 RED: Testing connection pool elasticity...');

    // Phase 1: Ramp up (grow pool)
    console.log('  Phase 1: Ramping up load...');
    const rampUpPromises = Array.from({ length: 50 }, (_, i) =>
      request.get(`http://localhost:3000/api/tracks?page=${i}`)
    );

    await Promise.all(rampUpPromises);

    // Phase 2: Idle period (allow pool to shrink)
    console.log('  Phase 2: Idle period (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Phase 3: Quick burst (test recovery)
    console.log('  Phase 3: Quick burst after idle...');
    const startTime = Date.now();

    const burstPromises = Array.from({ length: 30 }, () =>
      request.get('http://localhost:3000/api/status')
    );

    const responses = await Promise.all(burstPromises);
    const burstTime = Date.now() - startTime;

    const successCount = responses.filter(r => r.ok()).length;
    const successRate = successCount / 30;

    console.log(`✓ Post-idle burst time: ${burstTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Pool should adapt to load changes
    expect(burstTime).toBeLessThan(2000); // Should handle quickly
    expect(successRate).toBeGreaterThan(0.95);
  });
});
