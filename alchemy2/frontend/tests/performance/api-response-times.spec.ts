/**
 * API Response Time Performance Tests - RED Phase
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define API response time targets and will FAIL
 * until optimization work is completed in GREEN phase.
 *
 * API Performance Targets:
 * - Spotify Fetch API: < 500ms
 * - Download Track (job creation): < 200ms
 * - Job Status Query: < 100ms
 * - Processing Separation (job creation): < 300ms
 * - Analysis (job creation): < 250ms
 */

import { test, expect } from '@playwright/test';
import { measureAPIResponse, API_THRESHOLDS } from './helpers';

test.describe('API Response Times - RED Phase', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app to ensure backend is ready
    await page.goto('http://localhost:5173');
  });

  test('POST /api/spotify/fetch should respond in < 500ms', async ({ page }) => {
    const testUrl = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp'; // Example track

    const { responseTime, status, ok } = await measureAPIResponse(page, 'http://localhost:3000/api/spotify/fetch', {
      method: 'POST',
      data: { url: testUrl },
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`Spotify fetch response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: These will likely FAIL initially
    expect(ok, 'API should respond successfully').toBeTruthy();
    expect(responseTime, 'Response time should be < 500ms').toBeLessThan(API_THRESHOLDS.SPOTIFY_FETCH);
  });

  test('POST /api/download/track should respond in < 200ms', async ({ page }) => {
    // This creates a download job, should be fast (just DB insert + message queue)
    const { responseTime, status, ok } = await measureAPIResponse(
      page,
      'http://localhost:3000/api/download/track',
      {
        method: 'POST',
        data: {
          trackId: 'test-track-id-' + Date.now(),
          spotifyUrl: 'https://open.spotify.com/track/test',
          metadata: {
            title: 'Test Track',
            artist: 'Test Artist',
            album: 'Test Album',
          },
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Download track response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: Job creation should be very fast
    expect(ok, 'API should respond successfully').toBeTruthy();
    expect(responseTime, 'Response time should be < 200ms').toBeLessThan(API_THRESHOLDS.DOWNLOAD_CREATE);
  });

  test('GET /api/download/job/:id should respond in < 100ms', async ({ page }) => {
    const testJobId = 'test-job-id-' + Date.now();

    const { responseTime, status } = await measureAPIResponse(
      page,
      `http://localhost:3000/api/download/job/${testJobId}`,
      {
        method: 'GET',
      }
    );

    console.log(`Job status query response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: Simple DB query should be very fast
    expect(responseTime, 'Response time should be < 100ms').toBeLessThan(API_THRESHOLDS.JOB_STATUS);
  });

  test('POST /api/processing/separate should respond in < 300ms', async ({ page }) => {
    // This creates a separation job
    const { responseTime, status, ok } = await measureAPIResponse(
      page,
      'http://localhost:3000/api/processing/separate',
      {
        method: 'POST',
        data: {
          trackId: 'test-track-id-' + Date.now(),
          audioFilePath: '/tmp/test-audio.mp3',
          options: {
            outputFormat: 'wav',
            stems: ['vocals', 'drums', 'bass', 'other'],
          },
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Processing separation response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: Job creation should be fast
    expect(ok, 'API should respond successfully').toBeTruthy();
    expect(responseTime, 'Response time should be < 300ms').toBeLessThan(API_THRESHOLDS.PROCESSING_CREATE);
  });

  test('POST /api/analysis/analyze should respond in < 250ms', async ({ page }) => {
    // This creates an analysis job
    const { responseTime, status, ok } = await measureAPIResponse(page, 'http://localhost:3000/api/analysis/analyze', {
      method: 'POST',
      data: {
        trackId: 'test-track-id-' + Date.now(),
        audioFilePath: '/tmp/test-audio.mp3',
        analysisTypes: ['tempo', 'key', 'energy', 'danceability'],
      },
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`Analysis creation response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: Job creation should be fast
    expect(ok, 'API should respond successfully').toBeTruthy();
    expect(responseTime, 'Response time should be < 250ms').toBeLessThan(API_THRESHOLDS.ANALYSIS_CREATE);
  });

  test('should handle concurrent API requests efficiently', async ({ page }) => {
    const trackId = 'test-track-id-' + Date.now();

    // Make 5 concurrent requests
    const startTime = Date.now();

    const promises = Array.from({ length: 5 }, (_, i) =>
      measureAPIResponse(page, `http://localhost:3000/api/download/job/${trackId}-${i}`, {
        method: 'GET',
      })
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log(`Concurrent requests - Total: ${totalTime}ms, Avg: ${avgResponseTime}ms`);

    // RED Phase: Concurrent requests should not degrade performance significantly
    expect(avgResponseTime, 'Average response time').toBeLessThan(API_THRESHOLDS.JOB_STATUS * 1.5); // Allow 50% overhead
    expect(totalTime, 'Total time for 5 concurrent requests').toBeLessThan(1000); // < 1 second total
  });

  test('should return proper error responses quickly', async ({ page }) => {
    // Test error handling performance
    const { responseTime, status } = await measureAPIResponse(
      page,
      'http://localhost:3000/api/spotify/fetch',
      {
        method: 'POST',
        data: { url: 'invalid-url' },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Error response time: ${responseTime}ms (Status: ${status})`);

    // RED Phase: Error responses should be just as fast
    expect(responseTime, 'Error responses should be fast').toBeLessThan(300);
    expect(status, 'Should return error status').toBeGreaterThanOrEqual(400);
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Make rapid successive requests to test rate limiting
    const requests = Array.from({ length: 10 }, (_, i) =>
      measureAPIResponse(page, 'http://localhost:3000/api/download/job/test-' + i, {
        method: 'GET',
      })
    );

    const results = await Promise.all(requests);

    // Check for rate limit responses (429)
    const rateLimited = results.filter((r) => r.status === 429);
    const successful = results.filter((r) => r.ok);

    console.log(`Rate limiting test - Success: ${successful.length}, Rate limited: ${rateLimited.length}`);

    // RED Phase: Rate limiting should kick in but not block all requests
    if (rateLimited.length > 0) {
      // Rate limited responses should still be fast
      const avgRateLimitTime = rateLimited.reduce((sum, r) => sum + r.responseTime, 0) / rateLimited.length;
      expect(avgRateLimitTime, 'Rate limit responses should be fast').toBeLessThan(100);
    }

    // At least some requests should succeed
    expect(successful.length, 'Some requests should succeed').toBeGreaterThan(0);
  });

  test('should maintain performance under load', async ({ page }) => {
    // Simulate sustained load with 20 requests in sequence
    const results = [];

    for (let i = 0; i < 20; i++) {
      const result = await measureAPIResponse(page, `http://localhost:3000/api/download/job/load-test-${i}`, {
        method: 'GET',
      });
      results.push(result);
    }

    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxResponseTime = Math.max(...results.map((r) => r.responseTime));
    const minResponseTime = Math.min(...results.map((r) => r.responseTime));

    console.log(
      `Load test - Avg: ${avgResponseTime}ms, Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`
    );

    // RED Phase: Performance should remain consistent under load
    expect(avgResponseTime, 'Average response time under load').toBeLessThan(API_THRESHOLDS.JOB_STATUS * 1.2);
    expect(maxResponseTime, 'Max response time should not spike').toBeLessThan(API_THRESHOLDS.JOB_STATUS * 2);
  });

  test('should handle WebSocket connection quickly', async ({ page }) => {
    const startTime = Date.now();

    // Wait for WebSocket connection
    await page.waitForFunction(
      () => {
        return (window as any).__wsConnected === true;
      },
      { timeout: 5000 }
    );

    const connectionTime = Date.now() - startTime;

    console.log(`WebSocket connection time: ${connectionTime}ms`);

    // RED Phase: WebSocket connection should be fast
    expect(connectionTime, 'WebSocket connection time').toBeLessThan(1000); // < 1 second
  });
});
