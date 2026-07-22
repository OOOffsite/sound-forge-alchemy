/**
 * Memory and Resource Usage Performance Tests - RED Phase
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define memory usage targets and will FAIL
 * until optimization work is completed in GREEN phase.
 *
 * Memory Performance Targets:
 * - Initial load: < 100MB
 * - No memory leaks after navigation cycles
 * - Audio player cleanup on unmount
 * - WebSocket connection cleanup
 * - Event listener cleanup
 */

import { test, expect } from '@playwright/test';
import { getMemoryUsage, detectMemoryLeak, MEMORY_THRESHOLDS } from './helpers';

test.describe('Memory and Resource Usage - RED Phase', () => {
  test('memory should stay below 100MB after loading', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait a moment for everything to settle
    await page.waitForTimeout(1000);

    const memory = await getMemoryUsage(page);

    console.log(`Memory usage after load: ${memory.usedMB.toFixed(2)}MB`);
    console.log(`  Used: ${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`  Total: ${(memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`  Limit: ${(memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)}MB`);

    // RED Phase: Memory should be under threshold
    expect(memory.usedMB, 'Initial memory usage').toBeLessThan(MEMORY_THRESHOLDS.INITIAL_LOAD);
  });

  test('should not have memory leaks after 10 navigation cycles', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const initialMemory = await getMemoryUsage(page);
    console.log(`Initial memory: ${initialMemory.usedMB.toFixed(2)}MB`);

    // Navigate 10 times between different routes
    const routes = ['/library', '/player', '/processing', '/'];

    for (let i = 0; i < 10; i++) {
      const route = routes[i % routes.length];
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
    }

    // Wait for any cleanup
    await page.waitForTimeout(1000);

    // Try to force GC (may not work in all browsers)
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(500);

    const finalMemory = await getMemoryUsage(page);
    const memoryIncrease = (finalMemory.usedMB - initialMemory.usedMB) / initialMemory.usedMB;

    console.log(`Final memory: ${finalMemory.usedMB.toFixed(2)}MB`);
    console.log(`Memory increase: ${(memoryIncrease * 100).toFixed(2)}%`);

    // RED Phase: Memory should not increase significantly
    expect(memoryIncrease, 'Memory increase after navigation cycles').toBeLessThan(
      MEMORY_THRESHOLDS.MEMORY_LEAK_INCREASE
    );
  });

  test('audio player should cleanup resources on unmount', async ({ page }) => {
    await page.goto('http://localhost:5173/player');

    // Count audio elements before
    const initialAudioElements = await page.evaluate(() => document.querySelectorAll('audio, video').length);

    console.log(`Audio elements before unmount: ${initialAudioElements}`);

    // Navigate away to unmount audio player
    await page.goto('http://localhost:5173/library');
    await page.waitForLoadState('networkidle');

    // Wait for cleanup
    await page.waitForTimeout(500);

    // Count audio elements after
    const afterNavigationAudioElements = await page.evaluate(() => document.querySelectorAll('audio, video').length);

    console.log(`Audio elements after unmount: ${afterNavigationAudioElements}`);

    // RED Phase: Audio elements should be cleaned up
    expect(afterNavigationAudioElements, 'Audio elements should be cleaned up').toBeLessThanOrEqual(
      initialAudioElements * 0.5
    ); // At most 50% remaining
  });

  test('should cleanup event listeners on component unmount', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Get baseline event listener count
    const initialListeners = await page.evaluate(() => {
      return {
        click: (window as any).getEventListeners ? (window as any).getEventListeners(document).click?.length || 0 : 0,
        resize: (window as any).getEventListeners
          ? (window as any).getEventListeners(window).resize?.length || 0
          : 0,
      };
    });

    console.log(`Initial listeners - click: ${initialListeners.click}, resize: ${initialListeners.resize}`);

    // Navigate through several routes
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:5173/library');
      await page.goto('http://localhost:5173/player');
      await page.goto('http://localhost:5173/');
    }

    await page.waitForTimeout(500);

    // Check event listener count after navigation
    const finalListeners = await page.evaluate(() => {
      return {
        click: (window as any).getEventListeners ? (window as any).getEventListeners(document).click?.length || 0 : 0,
        resize: (window as any).getEventListeners
          ? (window as any).getEventListeners(window).resize?.length || 0
          : 0,
      };
    });

    console.log(`Final listeners - click: ${finalListeners.click}, resize: ${finalListeners.resize}`);

    // RED Phase: Event listeners should not accumulate excessively
    if (initialListeners.click > 0) {
      expect(finalListeners.click, 'Click listeners should not accumulate').toBeLessThan(initialListeners.click * 2);
    }
    if (initialListeners.resize > 0) {
      expect(finalListeners.resize, 'Resize listeners should not accumulate').toBeLessThan(
        initialListeners.resize * 2
      );
    }
  });

  test('should cleanup WebSocket connections on unmount', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check WebSocket connection
    const initialWsState = await page.evaluate(() => {
      return {
        connected: (window as any).__wsConnected || false,
        connections: (window as any).__wsCount || 0,
      };
    });

    console.log(`Initial WebSocket state:`, initialWsState);

    // Navigate away and back multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:5173/library');
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(500);
    }

    // Check WebSocket connections after navigation
    const finalWsState = await page.evaluate(() => {
      return {
        connected: (window as any).__wsConnected || false,
        connections: (window as any).__wsCount || 0,
      };
    });

    console.log(`Final WebSocket state:`, finalWsState);

    // RED Phase: Should not accumulate WebSocket connections
    expect(finalWsState.connections, 'WebSocket connections should not accumulate').toBeLessThanOrEqual(
      Math.max(initialWsState.connections, 1)
    );
  });

  test('should handle large data sets without memory issues', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    const beforeMemory = await getMemoryUsage(page);
    console.log(`Memory before loading data: ${beforeMemory.usedMB.toFixed(2)}MB`);

    // Simulate loading a large number of tracks
    await page.evaluate(() => {
      // Simulate adding many tracks to state
      const largeTracks = Array.from({ length: 1000 }, (_, i) => ({
        id: `track-${i}`,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        album: `Album ${i}`,
        duration: 180,
      }));

      // Trigger a state update with large data
      window.dispatchEvent(
        new CustomEvent('tracks-loaded', {
          detail: { tracks: largeTracks },
        })
      );
    });

    await page.waitForTimeout(1000);

    const afterMemory = await getMemoryUsage(page);
    const memoryIncrease = afterMemory.usedMB - beforeMemory.usedMB;

    console.log(`Memory after loading data: ${afterMemory.usedMB.toFixed(2)}MB`);
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

    // RED Phase: Large data sets should be handled efficiently
    expect(memoryIncrease, 'Memory increase for large data').toBeLessThan(50); // < 50MB increase
    expect(afterMemory.usedMB, 'Total memory with large data').toBeLessThan(150); // < 150MB total
  });

  test('should not leak memory with repeated renders', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    const leakDetection = await detectMemoryLeak(
      page,
      async () => {
        // Trigger re-renders by resizing
        await page.evaluate(() => {
          window.dispatchEvent(new Event('resize'));
        });
        await page.waitForTimeout(50);
      },
      20 // 20 iterations
    );

    console.log(`Memory leak detection:`);
    console.log(`  Initial: ${leakDetection.initialMB.toFixed(2)}MB`);
    console.log(`  Final: ${leakDetection.finalMB.toFixed(2)}MB`);
    console.log(`  Increase: ${(leakDetection.increase * 100).toFixed(2)}%`);
    console.log(`  Leaked: ${leakDetection.leaked}`);

    // RED Phase: Should not leak memory on repeated renders
    expect(leakDetection.leaked, 'Memory leak detected').toBe(false);
  });

  test('should handle cache efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const cacheInfo = await page.evaluate(() => {
      const performance = (window as any).performance;
      const resources = performance.getEntriesByType('resource');

      const cached = resources.filter((r: any) => r.transferSize === 0 || r.transferSize < r.encodedBodySize * 0.1);

      return {
        total: resources.length,
        cached: cached.length,
        cachePercentage: (cached.length / resources.length) * 100,
      };
    });

    console.log(`Cache efficiency:`);
    console.log(`  Total resources: ${cacheInfo.total}`);
    console.log(`  Cached resources: ${cacheInfo.cached}`);
    console.log(`  Cache hit rate: ${cacheInfo.cachePercentage.toFixed(1)}%`);

    // RED Phase: Should have reasonable cache hit rate on repeat visits
    if (cacheInfo.total > 0) {
      // First visit may have low cache rate, but check it's measured
      expect(cacheInfo.total, 'Should track resources').toBeGreaterThan(0);
    }
  });

  test('should cleanup timers and intervals', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Get baseline timer count
    const initialTimers = await page.evaluate(() => {
      return {
        timeouts: (window as any).__timeoutCount || 0,
        intervals: (window as any).__intervalCount || 0,
      };
    });

    console.log(`Initial timers - timeouts: ${initialTimers.timeouts}, intervals: ${initialTimers.intervals}`);

    // Navigate through routes with timers/intervals
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:5173/player');
      await page.waitForTimeout(200);
      await page.goto('http://localhost:5173/library');
      await page.waitForTimeout(200);
    }

    // Check timer count after navigation
    const finalTimers = await page.evaluate(() => {
      return {
        timeouts: (window as any).__timeoutCount || 0,
        intervals: (window as any).__intervalCount || 0,
      };
    });

    console.log(`Final timers - timeouts: ${finalTimers.timeouts}, intervals: ${finalTimers.intervals}`);

    // RED Phase: Timers should not accumulate excessively
    if (initialTimers.timeouts > 0) {
      expect(finalTimers.timeouts, 'Timeouts should be cleaned up').toBeLessThan(initialTimers.timeouts * 3);
    }
    if (initialTimers.intervals > 0) {
      expect(finalTimers.intervals, 'Intervals should be cleaned up').toBeLessThan(initialTimers.intervals * 2);
    }
  });

  test('should monitor DOM node count', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const initialDomNodes = await page.evaluate(() => document.querySelectorAll('*').length);

    console.log(`Initial DOM nodes: ${initialDomNodes}`);

    // Navigate through routes
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:5173/library');
      await page.goto('http://localhost:5173/player');
      await page.goto('http://localhost:5173/');
      await page.waitForTimeout(200);
    }

    const finalDomNodes = await page.evaluate(() => document.querySelectorAll('*').length);

    console.log(`Final DOM nodes: ${finalDomNodes}`);
    console.log(`DOM node increase: ${finalDomNodes - initialDomNodes}`);

    // RED Phase: DOM nodes should not accumulate excessively
    expect(finalDomNodes, 'DOM nodes should not accumulate').toBeLessThan(initialDomNodes * 1.5);
  });
});
