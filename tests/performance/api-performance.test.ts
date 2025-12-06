/**
 * API Performance Tests
 *
 * Tests API endpoint response times to ensure they meet performance requirements.
 * Thresholds:
 * - Fast endpoints (auth, simple queries): < 500ms
 * - Medium endpoints (complex queries): < 1000ms
 * - Heavy endpoints (external API calls): < 3000ms
 */

import axios, { AxiosResponse } from 'axios';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  FAST: 500,      // Simple endpoints
  MEDIUM: 1000,   // Medium complexity
  HEAVY: 3000,    // Heavy operations
};

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Helper function to measure response time
async function measureResponseTime(
  fn: () => Promise<AxiosResponse>
): Promise<{ duration: number; response: AxiosResponse | null; error: any }> {
  const startTime = performance.now();
  let response: AxiosResponse | null = null;
  let error: any = null;

  try {
    response = await fn();
  } catch (err) {
    error = err;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  return { duration, response, error };
}

// Helper to run multiple iterations and get statistics
async function runPerformanceTest(
  testName: string,
  fn: () => Promise<AxiosResponse>,
  threshold: number,
  iterations: number = 5
): Promise<void> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration, error } = await measureResponseTime(fn);

    if (error && !axios.isAxiosError(error)) {
      throw error;
    }

    durations.push(duration);

    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(`\n${testName}:`);
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
  console.log(`  Threshold: ${threshold}ms`);

  // Assert average is within threshold
  expect(avgDuration).toBeLessThan(threshold);
}

describe('API Performance Tests', () => {
  describe('Authentication Endpoints', () => {
    test('POST /api/auth/login - should respond within 500ms', async () => {
      await runPerformanceTest(
        'Login API',
        () => axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword123',
        }, {
          validateStatus: () => true, // Don't throw on any status
        }),
        THRESHOLDS.FAST,
        3
      );
    }, TEST_TIMEOUT);

    test('POST /api/auth/register - should respond within 500ms', async () => {
      await runPerformanceTest(
        'Register API',
        () => axios.post(`${API_BASE_URL}/api/auth/register`, {
          email: `test${Date.now()}@example.com`,
          password: 'testpassword123',
          name: 'Test User',
        }, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        3
      );
    }, TEST_TIMEOUT);

    test('GET /api/auth/me - should respond within 500ms', async () => {
      await runPerformanceTest(
        'Get Current User API',
        () => axios.get(`${API_BASE_URL}/api/auth/me`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('Data Retrieval Endpoints', () => {
    test('GET /api/tenants - should respond within 1000ms', async () => {
      await runPerformanceTest(
        'Get Tenants API',
        () => axios.get(`${API_BASE_URL}/api/tenants`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('GET /api/subscriptions - should respond within 1000ms', async () => {
      await runPerformanceTest(
        'Get Subscriptions API',
        () => axios.get(`${API_BASE_URL}/api/subscriptions`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('GET /api/usage-metrics - should respond within 1000ms', async () => {
      await runPerformanceTest(
        'Get Usage Metrics API',
        () => axios.get(`${API_BASE_URL}/api/usage-metrics`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('External API Integration Endpoints', () => {
    test('POST /api/google-reviews/sync - should respond within 3000ms', async () => {
      await runPerformanceTest(
        'Google Reviews Sync API',
        () => axios.post(`${API_BASE_URL}/api/google-reviews/sync`, {
          location_id: 'test-location-id',
        }, {
          validateStatus: () => true,
        }),
        THRESHOLDS.HEAVY,
        3
      );
    }, TEST_TIMEOUT);

    test('POST /api/google-reviews/sync-all - should respond within 3000ms', async () => {
      await runPerformanceTest(
        'Google Reviews Sync All API',
        () => axios.post(`${API_BASE_URL}/api/google-reviews/sync-all`, {}, {
          validateStatus: () => true,
        }),
        THRESHOLDS.HEAVY,
        3
      );
    }, TEST_TIMEOUT);
  });

  describe('Concurrent Request Handling', () => {
    test('should handle 10 concurrent requests efficiently', async () => {
      const startTime = performance.now();

      const requests = Array(10).fill(null).map(() =>
        axios.get(`${API_BASE_URL}/api/auth/me`, {
          validateStatus: () => true,
        })
      );

      await Promise.all(requests);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`\nConcurrent Requests (10):`);
      console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Threshold: ${THRESHOLDS.MEDIUM * 2}ms`);

      // Should not take significantly longer than 2x the normal threshold
      expect(totalDuration).toBeLessThan(THRESHOLDS.MEDIUM * 2);
    }, TEST_TIMEOUT);

    test('should handle 50 concurrent requests without timeout', async () => {
      const startTime = performance.now();

      const requests = Array(50).fill(null).map(() =>
        axios.get(`${API_BASE_URL}/api/hello`, {
          validateStatus: () => true,
          timeout: 5000,
        })
      );

      await Promise.all(requests);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`\nConcurrent Requests (50):`);
      console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Threshold: 5000ms`);

      // Should complete within 5 seconds
      expect(totalDuration).toBeLessThan(5000);
    }, TEST_TIMEOUT);
  });

  describe('Error Response Performance', () => {
    test('404 errors should respond quickly', async () => {
      await runPerformanceTest(
        '404 Error Response',
        () => axios.get(`${API_BASE_URL}/api/nonexistent-endpoint`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        5
      );
    }, TEST_TIMEOUT);

    test('405 Method Not Allowed should respond quickly', async () => {
      await runPerformanceTest(
        '405 Error Response',
        () => axios.get(`${API_BASE_URL}/api/auth/login`, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        5
      );
    }, TEST_TIMEOUT);

    test('400 Bad Request should respond quickly', async () => {
      await runPerformanceTest(
        '400 Error Response',
        () => axios.post(`${API_BASE_URL}/api/auth/login`, {
          // Missing required fields
        }, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('Response Time Consistency', () => {
    test('response times should be consistent (low variance)', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measureResponseTime(() =>
          axios.get(`${API_BASE_URL}/api/hello`, {
            validateStatus: () => true,
          })
        );
        durations.push(duration);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avg) * 100;

      console.log(`\nResponse Time Consistency:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`  Coefficient of Variation: ${coefficientOfVariation.toFixed(2)}%`);

      // Coefficient of variation should be less than 50% (reasonable consistency)
      expect(coefficientOfVariation).toBeLessThan(50);
    }, TEST_TIMEOUT * 2);
  });

  describe('Payload Size Impact', () => {
    test('small payload should process quickly', async () => {
      const smallPayload = {
        data: 'small',
      };

      await runPerformanceTest(
        'Small Payload (10 bytes)',
        () => axios.post(`${API_BASE_URL}/api/auth/login`, smallPayload, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST,
        5
      );
    }, TEST_TIMEOUT);

    test('large payload should still meet threshold', async () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB
      };

      await runPerformanceTest(
        'Large Payload (10KB)',
        () => axios.post(`${API_BASE_URL}/api/auth/login`, largePayload, {
          validateStatus: () => true,
        }),
        THRESHOLDS.FAST * 1.5, // Allow 50% more time for large payload
        3
      );
    }, TEST_TIMEOUT);
  });
});
