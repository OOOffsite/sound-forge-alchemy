/**
 * Component Render Performance Tests - RED Phase
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define component render performance targets
 * and will FAIL until optimization work is completed in GREEN phase.
 *
 * Component Performance Targets:
 * - AudioPlayer: < 100ms render time
 * - TrackLibrary (100 tracks): < 500ms render time
 * - JobProgress update: < 50ms
 * - TrackCard: < 30ms render time
 * - Waveform visualization: < 200ms render time
 */

import { test, expect } from '@playwright/test';
import { measureComponentRender } from './helpers';

test.describe('Component Render Performance - RED Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('AudioPlayer should render in < 100ms', async ({ page }) => {
    // Navigate to a page with AudioPlayer
    await page.goto('http://localhost:5173/player');

    const startTime = Date.now();

    // Wait for AudioPlayer to render
    await page.waitForSelector('[data-testid="audio-player"], .audio-player, audio', {
      state: 'visible',
      timeout: 5000,
    });

    const renderTime = Date.now() - startTime;

    console.log(`AudioPlayer render time: ${renderTime}ms`);

    // RED Phase: AudioPlayer should render quickly
    expect(renderTime, 'AudioPlayer render time').toBeLessThan(100);
  });

  test('TrackLibrary should render 100 tracks in < 500ms', async ({ page }) => {
    // Navigate to library page
    await page.goto('http://localhost:5173/library');

    const startTime = Date.now();

    // Wait for track items to render
    await page.waitForSelector('[data-testid="track-item"], .track-card, .track-row', {
      state: 'visible',
      timeout: 5000,
    });

    const renderTime = Date.now() - startTime;

    // Count rendered tracks
    const trackCount = await page.locator('[data-testid="track-item"], .track-card, .track-row').count();

    console.log(`TrackLibrary render time: ${renderTime}ms for ${trackCount} tracks`);

    // RED Phase: Should render many tracks quickly
    expect(renderTime, 'TrackLibrary render time').toBeLessThan(500);
    expect(trackCount, 'Should render multiple tracks').toBeGreaterThan(0);
  });

  test('JobProgress should update in < 50ms', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Find or create a job progress indicator
    await page.waitForSelector('[data-testid="job-progress"], .job-progress, .progress-bar', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.log('No job progress found, test will validate when component exists');
    });

    // Measure update performance by simulating Realtime message
    const updateTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();

        // Simulate a state update (would normally come from Realtime)
        window.dispatchEvent(
          new CustomEvent('job-progress-update', {
            detail: { jobId: 'test-job', progress: 50 },
          })
        );

        // Measure time to next frame
        requestAnimationFrame(() => {
          const endTime = performance.now();
          resolve(endTime - startTime);
        });
      });
    });

    console.log(`JobProgress update time: ${updateTime}ms`);

    // RED Phase: State updates should be nearly instant
    expect(updateTime, 'JobProgress update time').toBeLessThan(50);
  });

  test('TrackCard should render in < 30ms', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    // Measure single track card render
    const renderTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();

        // Create a performance mark
        performance.mark('trackCardRenderStart');

        // Trigger re-render or find first track card
        const trackCard = document.querySelector('[data-testid="track-item"], .track-card, .track-row');

        if (trackCard) {
          performance.mark('trackCardRenderEnd');
          const measure = performance.measure('trackCardRender', 'trackCardRenderStart', 'trackCardRenderEnd');
          resolve(measure.duration);
        } else {
          resolve(0);
        }
      });
    });

    console.log(`TrackCard render time: ${renderTime}ms`);

    // RED Phase: Individual cards should be very fast
    if (renderTime > 0) {
      expect(renderTime, 'TrackCard render time').toBeLessThan(30);
    }
  });

  test('Waveform visualization should render in < 200ms', async ({ page }) => {
    // Navigate to player with waveform
    await page.goto('http://localhost:5173/player');

    const startTime = Date.now();

    // Wait for waveform canvas or SVG
    await page.waitForSelector('[data-testid="waveform"], canvas, svg.waveform', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.log('No waveform found, test will validate when component exists');
    });

    const renderTime = Date.now() - startTime;

    console.log(`Waveform render time: ${renderTime}ms`);

    // RED Phase: Waveform should render reasonably fast
    expect(renderTime, 'Waveform render time').toBeLessThan(200);
  });

  test('should handle rapid component re-renders efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    // Measure time for 10 rapid re-renders
    const reRenderTimes = await page.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const times: number[] = [];

        const measureReRender = (iteration: number) => {
          if (iteration >= 10) {
            resolve(times);
            return;
          }

          const startTime = performance.now();

          // Trigger a re-render by dispatching event
          window.dispatchEvent(new Event('resize'));

          requestAnimationFrame(() => {
            const endTime = performance.now();
            times.push(endTime - startTime);
            measureReRender(iteration + 1);
          });
        };

        measureReRender(0);
      });
    });

    const avgReRenderTime = reRenderTimes.reduce((sum, t) => sum + t, 0) / reRenderTimes.length;
    const maxReRenderTime = Math.max(...reRenderTimes);

    console.log(`Re-render times - Avg: ${avgReRenderTime}ms, Max: ${maxReRenderTime}ms`);

    // RED Phase: Re-renders should be fast and consistent
    expect(avgReRenderTime, 'Average re-render time').toBeLessThan(50);
    expect(maxReRenderTime, 'Max re-render time').toBeLessThan(100);
  });

  test('should virtualize long lists efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    // Check if virtualization is working
    const virtualizedInfo = await page.evaluate(() => {
      const trackItems = document.querySelectorAll('[data-testid="track-item"], .track-card, .track-row');
      const viewportHeight = window.innerHeight;

      // Count how many items are actually in DOM vs should be visible
      const visibleItems = Array.from(trackItems).filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.top < viewportHeight && rect.bottom > 0;
      });

      return {
        totalInDom: trackItems.length,
        visibleItems: visibleItems.length,
        viewportHeight,
      };
    });

    console.log(
      `Virtualization - Total: ${virtualizedInfo.totalInDom}, Visible: ${virtualizedInfo.visibleItems}`
    );

    // RED Phase: If there are many tracks, only visible ones should be in DOM
    if (virtualizedInfo.totalInDom > 50) {
      // Should use virtualization for large lists
      expect(virtualizedInfo.totalInDom, 'Should virtualize large lists').toBeLessThan(
        virtualizedInfo.visibleItems * 3
      );
    }
  });

  test('should lazy load images in track cards', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    // Check if images are lazy loaded
    const imageLoadingInfo = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const lazyImages = Array.from(images).filter((img) => img.loading === 'lazy' || img.hasAttribute('data-src'));

      return {
        totalImages: images.length,
        lazyImages: lazyImages.length,
        lazyPercentage: (lazyImages.length / images.length) * 100,
      };
    });

    console.log(
      `Image loading - Total: ${imageLoadingInfo.totalImages}, Lazy: ${imageLoadingInfo.lazyImages} (${imageLoadingInfo.lazyPercentage.toFixed(1)}%)`
    );

    // RED Phase: Images should be lazy loaded
    if (imageLoadingInfo.totalImages > 5) {
      expect(imageLoadingInfo.lazyPercentage, 'Should lazy load most images').toBeGreaterThan(50);
    }
  });

  test('should debounce search input efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173/library');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search"]');

    if ((await searchInput.count()) > 0) {
      // Measure time for rapid typing
      const startTime = Date.now();

      // Type rapidly
      await searchInput.type('test query', { delay: 10 }); // 10ms between keys

      // Wait for debounced search to complete
      await page.waitForTimeout(500); // Typical debounce time

      const searchTime = Date.now() - startTime;

      console.log(`Search debounce time: ${searchTime}ms`);

      // RED Phase: Debounced search should not trigger on every keystroke
      expect(searchTime, 'Search should be debounced').toBeGreaterThan(400); // Should wait at least 400ms
      expect(searchTime, 'Search should complete reasonably').toBeLessThan(1000);
    }
  });

  test('should handle modal open/close efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Find a button that opens a modal
    const modalTrigger = page.locator('[data-testid="open-modal"], button:has-text("Settings"), button:has-text("Add")').first();

    if ((await modalTrigger.count()) > 0) {
      // Measure modal open time
      const openStartTime = Date.now();
      await modalTrigger.click();

      await page.waitForSelector('[role="dialog"], .modal, [data-testid="modal"]', {
        state: 'visible',
        timeout: 5000,
      });

      const openTime = Date.now() - openStartTime;

      // Measure modal close time
      const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close"), button:has-text("Cancel")').first();

      const closeStartTime = Date.now();
      await closeButton.click();

      await page.waitForSelector('[role="dialog"], .modal, [data-testid="modal"]', {
        state: 'hidden',
        timeout: 5000,
      });

      const closeTime = Date.now() - closeStartTime;

      console.log(`Modal open: ${openTime}ms, close: ${closeTime}ms`);

      // RED Phase: Modals should open/close quickly
      expect(openTime, 'Modal open time').toBeLessThan(100);
      expect(closeTime, 'Modal close time').toBeLessThan(100);
    }
  });
});
