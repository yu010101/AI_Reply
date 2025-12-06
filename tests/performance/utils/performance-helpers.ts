/**
 * Performance Testing Utilities
 *
 * Helper functions for measuring and analyzing performance metrics
 */

export interface PerformanceResult {
  duration: number;
  success: boolean;
  error?: any;
}

export interface PerformanceStats {
  average: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  variance: number;
  coefficientOfVariation: number;
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ duration: number; result: T | null; error: any }> {
  const startTime = performance.now();
  let result: T | null = null;
  let error: any = null;

  try {
    result = await fn();
  } catch (err) {
    error = err;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  return { duration, result, error };
}

/**
 * Calculate statistical metrics from an array of durations
 */
export function calculateStats(durations: number[]): PerformanceStats {
  const sorted = [...durations].sort((a, b) => a - b);
  const len = sorted.length;

  // Basic stats
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / len;
  const min = sorted[0];
  const max = sorted[len - 1];

  // Median
  const median = len % 2 === 0
    ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
    : sorted[Math.floor(len / 2)];

  // Percentiles
  const p95Index = Math.ceil(len * 0.95) - 1;
  const p99Index = Math.ceil(len * 0.99) - 1;
  const p95 = sorted[p95Index];
  const p99 = sorted[p99Index];

  // Variance and standard deviation
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / len;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (relative standard deviation)
  const coefficientOfVariation = (stdDev / average) * 100;

  return {
    average,
    min,
    max,
    median,
    p95,
    p99,
    stdDev,
    variance,
    coefficientOfVariation,
  };
}

/**
 * Format performance statistics for logging
 */
export function formatStats(name: string, stats: PerformanceStats, threshold?: number): string {
  const lines = [
    `\n${name}:`,
    `  Average: ${stats.average.toFixed(2)}ms`,
    `  Median: ${stats.median.toFixed(2)}ms`,
    `  Min: ${stats.min.toFixed(2)}ms`,
    `  Max: ${stats.max.toFixed(2)}ms`,
    `  P95: ${stats.p95.toFixed(2)}ms`,
    `  P99: ${stats.p99.toFixed(2)}ms`,
    `  Std Dev: ${stats.stdDev.toFixed(2)}ms`,
    `  CV: ${stats.coefficientOfVariation.toFixed(2)}%`,
  ];

  if (threshold) {
    lines.push(`  Threshold: ${threshold}ms`);
    const status = stats.average < threshold ? '✓ PASS' : '✗ FAIL';
    lines.push(`  Status: ${status}`);
  }

  return lines.join('\n');
}

/**
 * Run a performance test with multiple iterations
 */
export async function runPerformanceTest<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    iterations?: number;
    warmup?: number;
    delay?: number;
    threshold?: number;
    onIteration?: (iteration: number, duration: number) => void;
  } = {}
): Promise<PerformanceStats> {
  const {
    iterations = 5,
    warmup = 0,
    delay = 100,
    threshold,
    onIteration,
  } = options;

  const durations: number[] = [];

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await fn();
    await sleep(delay);
  }

  // Actual test runs
  for (let i = 0; i < iterations; i++) {
    const { duration, error } = await measureExecutionTime(fn);

    if (error && !isExpectedError(error)) {
      throw error;
    }

    durations.push(duration);

    if (onIteration) {
      onIteration(i + 1, duration);
    }

    if (i < iterations - 1) {
      await sleep(delay);
    }
  }

  const stats = calculateStats(durations);

  // Log results
  console.log(formatStats(name, stats, threshold));

  return stats;
}

/**
 * Check if an error is expected (e.g., validation errors, 404s)
 */
function isExpectedError(error: any): boolean {
  // Add logic to determine if error is expected
  // For example, HTTP 4xx errors might be expected in some tests
  return false;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a performance report
 */
export interface PerformanceTestResult {
  name: string;
  stats: PerformanceStats;
  threshold?: number;
  passed: boolean;
}

export function generatePerformanceReport(results: PerformanceTestResult[]): string {
  const header = [
    '\n' + '='.repeat(80),
    'PERFORMANCE TEST REPORT',
    '='.repeat(80),
  ].join('\n');

  const summary = results.map((result) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const thresholdInfo = result.threshold ? ` (threshold: ${result.threshold}ms)` : '';
    return `${status} ${result.name}: ${result.stats.average.toFixed(2)}ms${thresholdInfo}`;
  }).join('\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  const footer = [
    '',
    '='.repeat(80),
    `Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests} | Pass Rate: ${passRate}%`,
    '='.repeat(80),
  ].join('\n');

  return [header, summary, footer].join('\n');
}

/**
 * Assert that performance meets threshold
 */
export function assertPerformance(
  stats: PerformanceStats,
  threshold: number,
  metric: 'average' | 'p95' | 'p99' | 'max' = 'average'
): void {
  const value = stats[metric];
  if (value >= threshold) {
    throw new Error(
      `Performance assertion failed: ${metric} ${value.toFixed(2)}ms exceeds threshold ${threshold}ms`
    );
  }
}

/**
 * Compare two performance results
 */
export function comparePerformance(
  baseline: PerformanceStats,
  current: PerformanceStats
): {
  improvement: number;
  regression: boolean;
  percentageChange: number;
} {
  const improvement = baseline.average - current.average;
  const percentageChange = ((current.average - baseline.average) / baseline.average) * 100;
  const regression = current.average > baseline.average;

  return {
    improvement,
    regression,
    percentageChange,
  };
}

/**
 * Load baseline performance data
 */
export function loadBaseline(testName: string): PerformanceStats | null {
  // This would typically load from a file or database
  // For now, return null (no baseline)
  return null;
}

/**
 * Save performance baseline
 */
export function saveBaseline(testName: string, stats: PerformanceStats): void {
  // This would typically save to a file or database
  console.log(`Saving baseline for ${testName}:`, stats);
}

/**
 * Create a performance budget checker
 */
export function createBudgetChecker(budgets: Record<string, number>) {
  return {
    check(name: string, duration: number): boolean {
      const budget = budgets[name];
      if (!budget) {
        console.warn(`No budget defined for "${name}"`);
        return true;
      }
      return duration <= budget;
    },

    report(results: Record<string, number>): void {
      console.log('\n' + '='.repeat(80));
      console.log('PERFORMANCE BUDGET REPORT');
      console.log('='.repeat(80));

      Object.entries(results).forEach(([name, duration]) => {
        const budget = budgets[name];
        if (!budget) return;

        const status = duration <= budget ? '✓' : '✗';
        const percentage = ((duration / budget) * 100).toFixed(1);
        console.log(`${status} ${name}: ${duration.toFixed(2)}ms / ${budget}ms (${percentage}%)`);
      });

      console.log('='.repeat(80));
    },
  };
}
