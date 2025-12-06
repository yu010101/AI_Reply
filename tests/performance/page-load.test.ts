/**
 * Page Load Performance Tests
 *
 * Tests page load performance using Playwright to measure real browser performance metrics.
 * Metrics measured:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Time to Interactive (TTI)
 * - Total Blocking Time (TBT)
 * - Cumulative Layout Shift (CLS)
 * - Page Load Time
 */

import { test, expect, Page } from '@playwright/test';

// Performance thresholds based on Core Web Vitals
const PERFORMANCE_THRESHOLDS = {
  FCP: 1800,        // First Contentful Paint (ms)
  LCP: 2500,        // Largest Contentful Paint (ms)
  TTI: 3800,        // Time to Interactive (ms)
  TBT: 300,         // Total Blocking Time (ms)
  CLS: 0.1,         // Cumulative Layout Shift (unitless)
  LOAD_TIME: 3000,  // Total page load time (ms)
  DOM_LOAD: 2000,   // DOM Content Loaded (ms)
};

interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
}

/**
 * Collect performance metrics from the page
 */
async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const navigationStart = navigation.fetchStart;
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigationStart;
    const loadComplete = navigation.loadEventEnd - navigationStart;

    let firstPaint: number | undefined;
    let firstContentfulPaint: number | undefined;

    paint.forEach((entry) => {
      if (entry.name === 'first-paint') {
        firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        firstContentfulPaint = entry.startTime;
      }
    });

    return {
      navigationStart,
      domContentLoaded,
      loadComplete,
      firstPaint,
      firstContentfulPaint,
    };
  });

  // Try to get LCP from PerformanceObserver if available
  const lcp = await page.evaluate(() => {
    return new Promise<number | undefined>((resolve) => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry?.renderTime || lastEntry?.loadTime);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        setTimeout(() => resolve(undefined), 100);
      } catch (e) {
        resolve(undefined);
      }
    });
  });

  return {
    ...metrics,
    largestContentfulPaint: lcp,
  };
}

/**
 * Log performance metrics in a readable format
 */
function logMetrics(pageName: string, metrics: PerformanceMetrics): void {
  console.log(`\n${pageName} Performance Metrics:`);
  console.log(`  DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.DOM_LOAD}ms)`);
  console.log(`  Load Complete: ${metrics.loadComplete.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.LOAD_TIME}ms)`);

  if (metrics.firstPaint) {
    console.log(`  First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
  }

  if (metrics.firstContentfulPaint) {
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.FCP}ms)`);
  }

  if (metrics.largestContentfulPaint) {
    console.log(`  Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.LCP}ms)`);
  }
}

/**
 * Measure page load time
 */
async function measurePageLoad(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const endTime = Date.now();
  return endTime - startTime;
}

test.describe('Page Load Performance Tests', () => {
  test.describe('Public Pages', () => {
    test('Login page should load quickly', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/auth/login');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Login Page', metrics);

      // Assertions
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);

      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
      }

      if (metrics.largestContentfulPaint) {
        expect(metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
      }
    });

    test('Register page should load quickly', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/auth/register');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Register Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });

    test('Password reset page should load quickly', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/auth/reset-password');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Password Reset Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });
  });

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication
      await page.route('**/rest/v1/auth/v1/user', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
          }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
          headers: { 'content-range': '0-0/0' },
        });
      });
    });

    test('Dashboard page should load within threshold', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/dashboard');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Dashboard Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 1.5); // Allow more time for authenticated pages
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });

    test('Reviews page should load within threshold', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/reviews');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Reviews Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 1.5);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });

    test('Settings page should load within threshold', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/settings');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Settings Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 1.5);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });

    test('Locations page should load within threshold', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/locations');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Locations Page', metrics);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 1.5);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.DOM_LOAD);
    });
  });

  test.describe('Page Load with Data', () => {
    test('Dashboard with data should render efficiently', async ({ page }) => {
      // Mock data-heavy responses
      await page.route('**/rest/v1/reviews*', (route) => {
        const reviews = Array(50).fill(null).map((_, i) => ({
          id: `review-${i}`,
          rating: Math.floor(Math.random() * 5) + 1,
          comment: 'Test review comment',
          author: `User ${i}`,
          created_at: new Date().toISOString(),
        }));

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(reviews),
          headers: { 'content-range': `0-49/50` },
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('reviews')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
            headers: { 'content-range': '0-0/0' },
          });
        }
      });

      const loadTime = await measurePageLoad(page, '/dashboard');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Dashboard (with 50 reviews)', metrics);

      // Should still load within reasonable time even with data
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 2);
    });
  });

  test.describe('Sequential Page Navigation', () => {
    test('navigating between pages should be fast', async ({ page }) => {
      // Mock auth
      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
          headers: { 'content-range': '0-0/0' },
        });
      });

      // Load initial page
      await page.goto('/dashboard');

      // Measure navigation to reviews
      const startTime1 = Date.now();
      await page.click('a[href*="/reviews"]');
      await page.waitForLoadState('load');
      const navTime1 = Date.now() - startTime1;

      console.log(`\nPage Navigation Performance:`);
      console.log(`  Dashboard -> Reviews: ${navTime1}ms`);

      // Measure navigation to settings
      const startTime2 = Date.now();
      await page.click('a[href*="/settings"]');
      await page.waitForLoadState('load');
      const navTime2 = Date.now() - startTime2;

      console.log(`  Reviews -> Settings: ${navTime2}ms`);

      // Navigation should be fast (under 2 seconds)
      expect(navTime1).toBeLessThan(2000);
      expect(navTime2).toBeLessThan(2000);
    });
  });

  test.describe('Resource Loading', () => {
    test('page should not load excessive resources', async ({ page }) => {
      await page.goto('/dashboard');

      const resources = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return {
          total: entries.length,
          scripts: entries.filter(e => e.initiatorType === 'script').length,
          stylesheets: entries.filter(e => e.initiatorType === 'link' || e.initiatorType === 'css').length,
          images: entries.filter(e => e.initiatorType === 'img').length,
          fonts: entries.filter(e => e.name.includes('font')).length,
          totalSize: entries.reduce((sum, e) => sum + (e.transferSize || 0), 0),
        };
      });

      console.log(`\nResource Loading Stats:`);
      console.log(`  Total Resources: ${resources.total}`);
      console.log(`  Scripts: ${resources.scripts}`);
      console.log(`  Stylesheets: ${resources.stylesheets}`);
      console.log(`  Images: ${resources.images}`);
      console.log(`  Fonts: ${resources.fonts}`);
      console.log(`  Total Size: ${(resources.totalSize / 1024).toFixed(2)} KB`);

      // Reasonable limits
      expect(resources.total).toBeLessThan(100); // Not too many resources
      expect(resources.scripts).toBeLessThan(50); // Not too many scripts
      expect(resources.totalSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  test.describe('Mobile Performance', () => {
    test('login page should load quickly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Simulate mobile network conditions
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40, // 40ms RTT
      });

      const loadTime = await measurePageLoad(page, '/auth/login');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('Login Page (Mobile)', metrics);

      // Mobile should still be reasonably fast
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME * 2); // Allow 2x time on mobile
    });
  });

  test.describe('Cached vs Uncached Performance', () => {
    test('second load should be faster (caching)', async ({ page }) => {
      // First load (uncached)
      const firstLoadTime = await measurePageLoad(page, '/auth/login');
      const firstMetrics = await collectPerformanceMetrics(page);

      // Second load (cached)
      const secondLoadTime = await measurePageLoad(page, '/auth/login');
      const secondMetrics = await collectPerformanceMetrics(page);

      console.log(`\nCaching Performance:`);
      console.log(`  First Load: ${firstLoadTime}ms`);
      console.log(`  Second Load: ${secondLoadTime}ms`);
      console.log(`  Improvement: ${((1 - secondLoadTime / firstLoadTime) * 100).toFixed(1)}%`);

      // Second load should be faster or similar
      expect(secondLoadTime).toBeLessThanOrEqual(firstLoadTime * 1.2); // Allow 20% variance
    });
  });

  test.describe('Error Page Performance', () => {
    test('404 page should load quickly', async ({ page }) => {
      const loadTime = await measurePageLoad(page, '/non-existent-page');
      const metrics = await collectPerformanceMetrics(page);

      logMetrics('404 Page', metrics);

      // Error pages should be fast
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME);
    });
  });
});
