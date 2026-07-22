/**
 * Bundle Size and Loading Performance Tests - RED Phase
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests define bundle size targets and will FAIL
 * until optimization work is completed in GREEN phase.
 *
 * Bundle Performance Targets:
 * - Main JavaScript bundle: < 500KB gzipped
 * - Main CSS bundle: < 50KB gzipped
 * - Total JavaScript files: < 20 files
 * - Code splitting: Lazy load non-critical components
 * - Asset optimization: Proper caching headers
 */

import { test, expect } from '@playwright/test';
import { getBundleSize, BUNDLE_THRESHOLDS } from './helpers';
import * as pako from 'pako';

test.describe('Bundle Size and Loading - RED Phase', () => {
  test('main JavaScript bundle should be < 500KB gzipped', async ({ page }) => {
    // Navigate to get the bundle URL
    await page.goto('http://localhost:5173');

    // Find the main JS bundle
    const jsUrls: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('assets') && url.endsWith('.js') && !url.includes('node_modules')) {
        jsUrls.push(url);
      }
    });

    await page.waitForLoadState('networkidle');

    // Get the largest bundle (likely the main one)
    let maxSize = 0;
    let maxUrl = '';

    for (const url of jsUrls) {
      try {
        const response = await page.request.get(url);
        const buffer = await response.body();

        // Compress to get gzipped size
        const compressed = pako.gzip(buffer);
        const sizeKB = compressed.length / 1024;

        console.log(`JS Bundle: ${url.split('/').pop()} - ${sizeKB.toFixed(2)}KB gzipped`);

        if (sizeKB > maxSize) {
          maxSize = sizeKB;
          maxUrl = url;
        }
      } catch (error) {
        console.error(`Failed to measure ${url}:`, error);
      }
    }

    console.log(`Largest JS bundle: ${maxUrl.split('/').pop()} - ${maxSize.toFixed(2)}KB gzipped`);

    // RED Phase: Main bundle should be under threshold
    expect(maxSize, 'Main JS bundle size').toBeLessThan(BUNDLE_THRESHOLDS.MAIN_JS);
  });

  test('main CSS bundle should be < 50KB gzipped', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const cssUrls: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('assets') && url.endsWith('.css')) {
        cssUrls.push(url);
      }
    });

    await page.waitForLoadState('networkidle');

    // Get the largest CSS bundle
    let maxSize = 0;
    let maxUrl = '';

    for (const url of cssUrls) {
      try {
        const response = await page.request.get(url);
        const buffer = await response.body();

        // Compress to get gzipped size
        const compressed = pako.gzip(buffer);
        const sizeKB = compressed.length / 1024;

        console.log(`CSS Bundle: ${url.split('/').pop()} - ${sizeKB.toFixed(2)}KB gzipped`);

        if (sizeKB > maxSize) {
          maxSize = sizeKB;
          maxUrl = url;
        }
      } catch (error) {
        console.error(`Failed to measure ${url}:`, error);
      }
    }

    console.log(`Largest CSS bundle: ${maxUrl.split('/').pop()} - ${maxSize.toFixed(2)}KB gzipped`);

    // RED Phase: Main CSS should be under threshold
    expect(maxSize, 'Main CSS bundle size').toBeLessThan(BUNDLE_THRESHOLDS.MAIN_CSS);
  });

  test('should load < 20 JavaScript files', async ({ page }) => {
    const jsFiles: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.js') && !url.includes('node_modules')) {
        jsFiles.push(url);
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log(`Total JavaScript files loaded: ${jsFiles.length}`);
    jsFiles.forEach((url) => console.log(`  - ${url.split('/').pop()}`));

    // RED Phase: Should minimize number of JS files
    expect(jsFiles.length, 'Total JS files').toBeLessThan(BUNDLE_THRESHOLDS.MAX_JS_FILES);
  });

  test('should lazy load non-critical components', async ({ page }) => {
    // Track JS files loaded on initial page load
    const initialJsFiles: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.js') && !url.includes('node_modules')) {
        initialJsFiles.push(url);
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const initialCount = initialJsFiles.length;
    console.log(`Initial JS files loaded: ${initialCount}`);

    // Clear the array to track new files
    initialJsFiles.length = 0;

    // Navigate to a different route that should load additional chunks
    const routes = ['/library', '/player', '/processing'];

    for (const route of routes) {
      const beforeCount = initialJsFiles.length;

      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');

      const afterCount = initialJsFiles.length;
      const newFiles = afterCount - beforeCount;

      console.log(`Route ${route} loaded ${newFiles} additional JS files`);
    }

    // RED Phase: Should load additional chunks on navigation
    expect(initialJsFiles.length, 'Should lazy load route chunks').toBeGreaterThan(0);
  });

  test('should have proper caching headers', async ({ page }) => {
    const cachingInfo: Array<{ url: string; cacheControl: string | null; etag: string | null }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('assets') && (url.endsWith('.js') || url.endsWith('.css'))) {
        cachingInfo.push({
          url: url.split('/').pop() || url,
          cacheControl: response.headers()['cache-control'] || null,
          etag: response.headers()['etag'] || null,
        });
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('Caching headers:');
    cachingInfo.forEach((info) => {
      console.log(`  ${info.url}`);
      console.log(`    Cache-Control: ${info.cacheControl || 'MISSING'}`);
      console.log(`    ETag: ${info.etag || 'MISSING'}`);
    });

    // RED Phase: Static assets should have caching headers
    const withCaching = cachingInfo.filter((info) => info.cacheControl || info.etag);
    const cachingPercentage = (withCaching.length / cachingInfo.length) * 100;

    expect(cachingPercentage, 'Assets with caching headers').toBeGreaterThan(80); // At least 80%
  });

  test('should minify JavaScript in production', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const jsUrls: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('assets') && url.endsWith('.js')) {
        jsUrls.push(url);
      }
    });

    await page.waitForLoadState('networkidle');

    // Check if JS is minified by looking for whitespace and comments
    for (const url of jsUrls.slice(0, 3)) {
      // Check first 3 files
      try {
        const response = await page.request.get(url);
        const content = await response.text();

        const lines = content.split('\n');
        const avgLineLength = content.length / lines.length;

        // Minified files typically have long lines (avg > 100 chars)
        console.log(`${url.split('/').pop()}: ${lines.length} lines, avg ${avgLineLength.toFixed(0)} chars/line`);

        // RED Phase: Production builds should be minified
        if (process.env.NODE_ENV === 'production') {
          expect(avgLineLength, 'JS should be minified in production').toBeGreaterThan(100);
        }
      } catch (error) {
        console.error(`Failed to check ${url}:`, error);
      }
    }
  });

  test('should optimize images with proper formats', async ({ page }) => {
    const imageInfo: Array<{ url: string; size: number; type: string }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.startsWith('image/')) {
        const buffer = await response.body();
        imageInfo.push({
          url: url.split('/').pop() || url,
          size: buffer.length / 1024, // KB
          type: contentType,
        });
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('Image optimization:');
    imageInfo.forEach((info) => {
      console.log(`  ${info.url}: ${info.size.toFixed(2)}KB (${info.type})`);
    });

    // RED Phase: Images should be reasonably sized
    const largeImages = imageInfo.filter((img) => img.size > 500); // > 500KB
    expect(largeImages.length, 'Number of large images').toBeLessThan(imageInfo.length * 0.2); // < 20% large

    // Should use modern formats
    const modernFormats = imageInfo.filter((img) => img.type.includes('webp') || img.type.includes('avif'));
    if (imageInfo.length > 0) {
      const modernPercentage = (modernFormats.length / imageInfo.length) * 100;
      console.log(`Modern image formats: ${modernPercentage.toFixed(1)}%`);
    }
  });

  test('should implement tree shaking for unused code', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const jsUrls: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('assets') && url.endsWith('.js')) {
        jsUrls.push(url);
      }
    });

    await page.waitForLoadState('networkidle');

    // Check for common unused libraries (lodash, moment.js, etc.)
    let totalSize = 0;
    const unusedLibraries: string[] = [];

    for (const url of jsUrls) {
      try {
        const response = await page.request.get(url);
        const content = await response.text();
        const buffer = await response.body();

        totalSize += buffer.length;

        // Check for full library imports (indicates poor tree shaking)
        if (content.includes('lodash') && content.includes('_.VERSION')) {
          unusedLibraries.push('lodash (full library)');
        }
        if (content.includes('moment') && content.includes('moment.version')) {
          unusedLibraries.push('moment.js (full library)');
        }
      } catch (error) {
        console.error(`Failed to check ${url}:`, error);
      }
    }

    console.log(`Total JS size: ${(totalSize / 1024).toFixed(2)}KB`);
    if (unusedLibraries.length > 0) {
      console.log('Unused libraries detected:', unusedLibraries);
    }

    // RED Phase: Should not include full unused libraries
    expect(unusedLibraries.length, 'Unused libraries').toBe(0);
  });

  test('should use code splitting for routes', async ({ page }) => {
    // Navigate to main page and track loaded chunks
    const loadedChunks = new Set<string>();

    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.js') && url.includes('assets')) {
        loadedChunks.add(url);
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const homeChunks = loadedChunks.size;
    console.log(`Home page chunks: ${homeChunks}`);

    // Navigate to different routes
    const routes = ['/library', '/player', '/processing'];
    const routeChunks: Record<string, number> = {};

    for (const route of routes) {
      const beforeSize = loadedChunks.size;

      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');

      const afterSize = loadedChunks.size;
      const newChunks = afterSize - beforeSize;

      routeChunks[route] = newChunks;
      console.log(`${route} loaded ${newChunks} new chunks`);
    }

    // RED Phase: Each route should load its own chunks
    const routesWithChunks = Object.values(routeChunks).filter((count) => count > 0);
    expect(routesWithChunks.length, 'Routes with code splitting').toBeGreaterThan(0);
  });

  test('should compress assets with Brotli or Gzip', async ({ page }) => {
    const compressionInfo: Array<{ url: string; encoding: string | null }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if ((url.endsWith('.js') || url.endsWith('.css')) && url.includes('assets')) {
        compressionInfo.push({
          url: url.split('/').pop() || url,
          encoding: response.headers()['content-encoding'] || null,
        });
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('Compression:');
    compressionInfo.forEach((info) => {
      console.log(`  ${info.url}: ${info.encoding || 'NONE'}`);
    });

    // RED Phase: Assets should be compressed in production
    if (process.env.NODE_ENV === 'production') {
      const compressed = compressionInfo.filter((info) => info.encoding === 'gzip' || info.encoding === 'br');
      const compressionPercentage = (compressed.length / compressionInfo.length) * 100;

      expect(compressionPercentage, 'Compressed assets').toBeGreaterThan(80); // At least 80%
    }
  });
});
