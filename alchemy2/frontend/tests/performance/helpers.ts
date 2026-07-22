/**
 * Performance Testing Helpers
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * Utilities for measuring and validating performance metrics.
 */

import { Page } from '@playwright/test';

/**
 * Core Web Vitals thresholds
 */
export const WEB_VITALS_THRESHOLDS = {
  FCP: 1000, // First Contentful Paint < 1s
  LCP: 2500, // Largest Contentful Paint < 2.5s
  FID: 100, // First Input Delay < 100ms
  CLS: 0.1, // Cumulative Layout Shift < 0.1
  TTFB: 800, // Time to First Byte < 800ms
  TTI: 3000, // Time to Interactive < 3s
} as const;

/**
 * API response time thresholds (ms)
 */
export const API_THRESHOLDS = {
  SPOTIFY_FETCH: 500,
  DOWNLOAD_CREATE: 200,
  JOB_STATUS: 100,
  PROCESSING_CREATE: 300,
  ANALYSIS_CREATE: 250,
} as const;

/**
 * Bundle size thresholds (KB, gzipped)
 */
export const BUNDLE_THRESHOLDS = {
  MAIN_JS: 500,
  MAIN_CSS: 50,
  MAX_JS_FILES: 20,
} as const;

/**
 * Memory thresholds
 */
export const MEMORY_THRESHOLDS = {
  INITIAL_LOAD: 100, // MB
  MEMORY_LEAK_INCREASE: 0.2, // 20% increase
} as const;

/**
 * Measure First Contentful Paint
 */
export async function measureFCP(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const entries = performance.getEntriesByName('first-contentful-paint');
    if (entries.length === 0) return 0;
    return entries[0].startTime;
  });
}

/**
 * Measure Largest Contentful Paint
 */
export async function measureLCP(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcpValue = 0;

      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1] as any;
          lcpValue = lastEntry.startTime;
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Wait for LCP to stabilize
      setTimeout(() => {
        observer.disconnect();
        resolve(lcpValue);
      }, 3000);
    });
  });
}

/**
 * Measure Cumulative Layout Shift
 */
export async function measureCLS(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;

      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // Measure CLS for 3 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 3000);
    });
  });
}

/**
 * Measure Time to Interactive
 */
export async function measureTTI(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const timing = performance.timing;
    return timing.domInteractive - timing.navigationStart;
  });
}

/**
 * Measure Time to First Byte
 */
export async function measureTTFB(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const timing = performance.timing;
    return timing.responseStart - timing.navigationStart;
  });
}

/**
 * Measure page load time
 */
export async function measurePageLoad(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const timing = performance.timing;
    return timing.loadEventEnd - timing.navigationStart;
  });
}

/**
 * Measure API response time
 */
export async function measureAPIResponse(
  page: Page,
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
  }
): Promise<{ responseTime: number; status: number; ok: boolean }> {
  const startTime = Date.now();

  const response = await page.request[options?.method?.toLowerCase() || 'get'](url, {
    data: options?.data,
    headers: options?.headers,
  });

  const responseTime = Date.now() - startTime;

  return {
    responseTime,
    status: response.status(),
    ok: response.ok(),
  };
}

/**
 * Get current memory usage
 */
export async function getMemoryUsage(page: Page): Promise<{
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedMB: number;
}> {
  return await page.evaluate(() => {
    const memory = (performance as any).memory;
    if (!memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usedMB: 0,
      };
    }

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: memory.usedJSHeapSize / (1024 * 1024),
    };
  });
}

/**
 * Get bundle size for a resource
 */
export async function getBundleSize(page: Page, resourceUrl: string): Promise<number> {
  const response = await page.request.get(resourceUrl);
  const buffer = await response.body();
  return buffer.length / 1024; // Return KB
}

/**
 * Count resource files by type
 */
export async function countResourceFiles(
  page: Page,
  extension: string
): Promise<{ files: string[]; count: number }> {
  return new Promise((resolve) => {
    const files: string[] = [];

    page.on('response', (response) => {
      if (response.url().endsWith(extension)) {
        files.push(response.url());
      }
    });

    // Wait for network idle
    page.waitForLoadState('networkidle').then(() => {
      resolve({ files, count: files.length });
    });
  });
}

/**
 * Measure component render time
 */
export async function measureComponentRender(
  page: Page,
  componentSelector: string
): Promise<number> {
  const startTime = Date.now();
  await page.waitForSelector(componentSelector, { state: 'visible' });
  return Date.now() - startTime;
}

/**
 * Check for memory leaks by comparing before/after memory usage
 */
export async function detectMemoryLeak(
  page: Page,
  action: () => Promise<void>,
  iterations: number = 10
): Promise<{ leaked: boolean; increase: number; initialMB: number; finalMB: number }> {
  // Get initial memory
  const initialMemory = await getMemoryUsage(page);

  // Perform action multiple times
  for (let i = 0; i < iterations; i++) {
    await action();
  }

  // Force garbage collection if available
  await page.evaluate(() => {
    if ((window as any).gc) {
      (window as any).gc();
    }
  });

  // Get final memory
  const finalMemory = await getMemoryUsage(page);

  const increase = (finalMemory.usedMB - initialMemory.usedMB) / initialMemory.usedMB;
  const leaked = increase > MEMORY_THRESHOLDS.MEMORY_LEAK_INCREASE;

  return {
    leaked,
    increase,
    initialMB: initialMemory.usedMB,
    finalMB: finalMemory.usedMB,
  };
}

/**
 * Performance metrics summary
 */
export interface PerformanceMetrics {
  pageLoad: number;
  fcp: number;
  lcp: number;
  cls: number;
  tti: number;
  ttfb: number;
  memoryMB: number;
}

/**
 * Collect all Core Web Vitals
 */
export async function collectWebVitals(page: Page): Promise<PerformanceMetrics> {
  const [pageLoad, fcp, lcp, cls, tti, ttfb, memory] = await Promise.all([
    measurePageLoad(page),
    measureFCP(page),
    measureLCP(page),
    measureCLS(page),
    measureTTI(page),
    measureTTFB(page),
    getMemoryUsage(page),
  ]);

  return {
    pageLoad,
    fcp,
    lcp,
    cls,
    tti,
    ttfb,
    memoryMB: memory.usedMB,
  };
}

/**
 * Log performance metrics
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  console.log('\n=== Performance Metrics ===');
  console.log(`Page Load: ${metrics.pageLoad.toFixed(2)}ms`);
  console.log(`FCP: ${metrics.fcp.toFixed(2)}ms`);
  console.log(`LCP: ${metrics.lcp.toFixed(2)}ms`);
  console.log(`CLS: ${metrics.cls.toFixed(4)}`);
  console.log(`TTI: ${metrics.tti.toFixed(2)}ms`);
  console.log(`TTFB: ${metrics.ttfb.toFixed(2)}ms`);
  console.log(`Memory: ${metrics.memoryMB.toFixed(2)}MB`);
  console.log('========================\n');
}
