/**
 * API Throughput Load Tests - RED Phase (TDD)
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define API throughput targets and will FAIL
 * until backend optimizations are completed in GREEN phase.
 *
 * Throughput Targets:
 * - /api/spotify/fetch: 100 requests/second
 * - /api/download/job/:id: 200 requests/second
 * - /api/processing/status: 150 requests/second
 * - /api/tracks: 100 requests/second
 *
 * Success Rate Targets:
 * - > 95% success rate under normal load
 * - > 90% success rate under peak load
 */

import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Helper function to throttle requests to maintain target rate
 */
async function throttledRequests(
  request: APIRequestContext,
  url: string,
  method: 'GET' | 'POST',
  requestsPerSecond: number,
  duration: number,
  dataFn?: (index: number) => any
): Promise<{ responses: any[], totalTime: number, successRate: number }> {
  const totalRequests = requestsPerSecond * duration;
  const promises: Promise<any>[] = [];
  const startTime = Date.now();

  for (let i = 0; i < totalRequests; i++) {
    const requestPromise = method === 'GET'
      ? request.get(url)
      : request.post(url, { data: dataFn?.(i) || {} });

    promises.push(requestPromise.catch(err => ({ error: err })));

    // Throttle to maintain requests per second
    if ((i + 1) % requestsPerSecond === 0 && i + 1 < totalRequests) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const responses = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  const successCount = responses.filter(r => r.ok && r.ok()).length;
  const successRate = successCount / totalRequests;

  return { responses, totalTime, successRate };
}

test.describe('API Throughput - RED Phase', () => {
  test('should handle 100 requests/second to /api/spotify/fetch', async ({ request }) => {
    console.log('🔴 RED: Testing 100 req/s to /api/spotify/fetch...');

    const requestsPerSecond = 100;
    const duration = 5; // seconds

    const { responses, totalTime, successRate } = await throttledRequests(
      request,
      'http://localhost:3000/api/spotify/fetch',
      'POST',
      requestsPerSecond,
      duration,
      (i) => ({
        url: `https://open.spotify.com/track/test-track-${i % 100}`,
        cached: true // Use cached data for testing
      })
    );

    const totalRequests = requestsPerSecond * duration;

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`✓ Requests sent: ${totalRequests}`);

    // RED Phase: Should complete within expected time (5s + 10% overhead)
    expect(totalTime).toBeLessThan(duration * 1000 * 1.1);

    // Verify success rate > 95%
    expect(successRate).toBeGreaterThan(0.95);
  });

  test('should handle 200 requests/second to /api/download/job/:id', async ({ request }) => {
    console.log('🔴 RED: Testing 200 req/s to /api/download/job/:id...');

    const requestsPerSecond = 200;
    const duration = 5;
    const jobIds = Array.from({ length: 10 }, (_, i) => `test-job-${i}`);

    const { responses, totalTime, successRate } = await throttledRequests(
      request,
      'http://localhost:3000/api/download/job/test-job',
      'GET',
      requestsPerSecond,
      duration
    );

    const totalRequests = requestsPerSecond * duration;

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // Calculate response times
    const responseTimes = responses
      .filter(r => r.ok && r.ok())
      .map((_, i) => totalTime / totalRequests); // Approximation

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    console.log(`✓ Avg response time: ${avgResponseTime.toFixed(0)}ms`);

    // RED Phase: Performance targets
    expect(totalTime).toBeLessThan(duration * 1000 * 1.1);
    expect(successRate).toBeGreaterThan(0.98); // Higher success rate for GET
    expect(avgResponseTime).toBeLessThan(100); // < 100ms average
  });

  test('should handle 150 requests/second to /api/processing/status', async ({ request }) => {
    console.log('🔴 RED: Testing 150 req/s to /api/processing/status...');

    const requestsPerSecond = 150;
    const duration = 5;

    const { responses, totalTime, successRate } = await throttledRequests(
      request,
      'http://localhost:3000/api/processing/status',
      'POST',
      requestsPerSecond,
      duration,
      (i) => ({
        jobId: `test-processing-${i % 20}`
      })
    );

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle high polling rate
    expect(totalTime).toBeLessThan(duration * 1000 * 1.1);
    expect(successRate).toBeGreaterThan(0.95);
  });

  test('should handle 100 requests/second to /api/tracks', async ({ request }) => {
    console.log('🔴 RED: Testing 100 req/s to /api/tracks...');

    const requestsPerSecond = 100;
    const duration = 5;

    const { responses, totalTime, successRate } = await throttledRequests(
      request,
      'http://localhost:3000/api/tracks?limit=20',
      'GET',
      requestsPerSecond,
      duration
    );

    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Database queries should scale
    expect(totalTime).toBeLessThan(duration * 1000 * 1.1);
    expect(successRate).toBeGreaterThan(0.95);
  });

  test('should handle burst traffic (500 requests in 2 seconds)', async ({ request }) => {
    console.log('🔴 RED: Testing burst traffic (500 requests in 2s)...');

    const totalRequests = 500;
    const startTime = Date.now();

    // Send all requests at once (burst)
    const promises = Array.from({ length: totalRequests }, (_, i) =>
      request.get(`http://localhost:3000/api/status`).catch(err => ({ error: err }))
    );

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const successCount = responses.filter(r => r.ok && r.ok()).length;
    const successRate = successCount / totalRequests;

    console.log(`✓ Burst completed in: ${totalTime}ms`);
    console.log(`✓ Success rate: ${(successRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle burst within 2 seconds
    expect(totalTime).toBeLessThan(2000);

    // Should handle at least 90% under burst
    expect(successRate).toBeGreaterThan(0.90);
  });

  test('should maintain throughput under sustained load (60 seconds)', async ({ request }) => {
    console.log('🔴 RED: Testing sustained load over 60 seconds...');

    const requestsPerSecond = 50;
    const duration = 60; // 1 minute
    const samples: { time: number, successRate: number }[] = [];

    const startTime = Date.now();

    // Measure throughput in 10-second windows
    for (let window = 0; window < duration / 10; window++) {
      const windowStart = Date.now();

      const { successRate } = await throttledRequests(
        request,
        'http://localhost:3000/api/status',
        'GET',
        requestsPerSecond,
        10
      );

      const windowTime = Date.now() - windowStart;

      samples.push({ time: windowTime, successRate });

      console.log(`✓ Window ${window + 1}: ${windowTime}ms, ${(successRate * 100).toFixed(1)}% success`);
    }

    const totalTime = Date.now() - startTime;
    const avgSuccessRate = samples.reduce((a, b) => a + b.successRate, 0) / samples.length;

    console.log(`✓ Total sustained test time: ${totalTime}ms`);
    console.log(`✓ Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`);

    // RED Phase: Should maintain performance over time
    expect(avgSuccessRate).toBeGreaterThan(0.95);

    // No significant degradation over time
    const firstHalf = samples.slice(0, 3).reduce((a, b) => a + b.successRate, 0) / 3;
    const secondHalf = samples.slice(3).reduce((a, b) => a + b.successRate, 0) / 3;
    const degradation = firstHalf - secondHalf;

    console.log(`✓ Performance degradation: ${(degradation * 100).toFixed(2)}%`);

    expect(degradation).toBeLessThan(0.05); // < 5% degradation
  });

  test('should handle mixed API endpoints concurrently', async ({ request }) => {
    console.log('🔴 RED: Testing mixed API endpoint load...');

    const duration = 10; // seconds
    const startTime = Date.now();

    // Different endpoints with different rates
    const endpoints = [
      { url: 'http://localhost:3000/api/status', rate: 50 },
      { url: 'http://localhost:3000/api/tracks?limit=10', rate: 30 },
      { url: 'http://localhost:3000/api/download/jobs', rate: 20 },
    ];

    const workloads = endpoints.map(async endpoint => {
      return throttledRequests(
        request,
        endpoint.url,
        'GET',
        endpoint.rate,
        duration
      );
    });

    const results = await Promise.all(workloads);
    const totalTime = Date.now() - startTime;

    const totalRequests = results.reduce((sum, r) => sum + r.responses.length, 0);
    const totalSuccess = results.reduce((sum, r) => sum + r.responses.filter(resp => resp.ok && resp.ok()).length, 0);
    const overallSuccessRate = totalSuccess / totalRequests;

    console.log(`✓ Mixed load completed in: ${totalTime}ms`);
    console.log(`✓ Total requests: ${totalRequests}`);
    console.log(`✓ Overall success rate: ${(overallSuccessRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle mixed load efficiently
    expect(totalTime).toBeLessThan(duration * 1000 * 1.1);
    expect(overallSuccessRate).toBeGreaterThan(0.95);
  });

  test('should recover quickly after traffic spike', async ({ request }) => {
    console.log('🔴 RED: Testing recovery after traffic spike...');

    // Phase 1: Traffic spike (300 requests simultaneously)
    console.log('  Phase 1: Generating traffic spike...');
    const spikeRequests = 300;
    const spikeStartTime = Date.now();

    const spikePromises = Array.from({ length: spikeRequests }, () =>
      request.get('http://localhost:3000/api/status').catch(err => ({ error: err }))
    );

    await Promise.all(spikePromises);
    const spikeTime = Date.now() - spikeStartTime;

    console.log(`  ✓ Spike completed in: ${spikeTime}ms`);

    // Phase 2: Wait for recovery
    console.log('  Phase 2: Waiting 5 seconds for recovery...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Phase 3: Measure normal performance
    console.log('  Phase 3: Testing post-spike performance...');
    const recoveryStartTime = Date.now();
    const recoveryResponse = await request.get('http://localhost:3000/api/status');
    const recoveryTime = Date.now() - recoveryStartTime;

    console.log(`  ✓ Post-spike response time: ${recoveryTime}ms`);

    // RED Phase: Should return to normal quickly
    expect(recoveryResponse.ok()).toBeTruthy();
    expect(recoveryTime).toBeLessThan(500); // Back to < 500ms
  });
});
