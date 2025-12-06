# Performance Tests

This directory contains comprehensive performance tests for the AI Reply application.

## Overview

Performance tests are critical for ensuring the application maintains acceptable response times and user experience. These tests measure:

- **API Response Times**: How quickly API endpoints respond to requests
- **Page Load Performance**: Browser-based metrics including FCP, LCP, TTI, and total load time
- **Database Query Performance**: Query execution times for various database operations

## Test Structure

### 1. API Performance Tests (`api-performance.test.ts`)

Tests API endpoint response times against defined thresholds.

**Thresholds:**
- Fast endpoints (auth, simple queries): < 500ms
- Medium endpoints (complex queries): < 1000ms
- Heavy endpoints (external API calls): < 3000ms

**Test Categories:**
- Authentication endpoints (login, register, get user)
- Data retrieval endpoints (tenants, subscriptions, metrics)
- External API integrations (Google Reviews sync)
- Concurrent request handling
- Error response performance
- Response time consistency
- Payload size impact

### 2. Page Load Performance Tests (`page-load.test.ts`)

Tests real browser page load performance using Playwright.

**Metrics Measured:**
- First Contentful Paint (FCP) - < 1800ms
- Largest Contentful Paint (LCP) - < 2500ms
- Time to Interactive (TTI) - < 3800ms
- DOM Content Loaded - < 2000ms
- Total Page Load Time - < 3000ms

**Test Categories:**
- Public pages (login, register, password reset)
- Authenticated pages (dashboard, reviews, settings)
- Page load with data
- Sequential navigation performance
- Resource loading optimization
- Mobile performance
- Caching effectiveness
- Error page performance

### 3. Database Performance Tests (`database-performance.test.ts`)

Tests Supabase database query performance.

**Thresholds:**
- Simple queries (indexed, single row): < 100ms
- Medium queries (filtered, joined): < 300ms
- Complex queries (aggregations, multiple joins): < 1000ms

**Test Categories:**
- Simple SELECT queries
- Filtered queries with WHERE clauses
- JOIN operations
- Aggregations (COUNT, AVG, etc.)
- Write operations (INSERT, UPDATE, DELETE)
- Batch operations
- Pagination performance
- Full-text search
- Concurrent query handling
- Result set size impact

## Running Performance Tests

### Run All Performance Tests

```bash
npm run test:perf
```

This runs all three test suites sequentially.

### Run Individual Test Suites

**API Performance Tests:**
```bash
npm run test:perf:api
```

**Page Load Performance Tests:**
```bash
npm run test:perf:page
```

**Database Performance Tests:**
```bash
npm run test:perf:db
```

### View Performance Report

After running page load tests, view the detailed report:

```bash
npm run test:perf:report
```

## Configuration

### Environment Variables

Ensure these environment variables are set before running tests:

```bash
# API Base URL (for API tests)
API_BASE_URL=http://localhost:3000

# Supabase Configuration (for database tests)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Jest Configuration

Performance tests use a custom Jest configuration (`jest.config.performance.js`):
- Single worker for consistent measurements
- 30-second timeout
- Verbose output for detailed metrics
- No coverage collection
- Sequential execution (not parallel)

### Playwright Configuration

Page load tests use a custom Playwright configuration (`playwright.config.performance.ts`):
- Single worker for consistent measurements
- No retries (to avoid skewing results)
- Always captures trace for performance analysis
- Chromium only for consistent metrics
- Increased timeout (30 seconds)

## Understanding Results

### API Performance Test Output

```
Login API:
  Average: 245.32ms
  Min: 198.45ms
  Max: 312.78ms
  Threshold: 500ms
```

- **Average**: Mean response time across all iterations
- **Min**: Fastest response time observed
- **Max**: Slowest response time observed
- **Threshold**: Maximum acceptable response time

### Page Load Test Output

```
Login Page Performance Metrics:
  DOM Content Loaded: 842.15ms (threshold: 2000ms)
  Load Complete: 1234.56ms (threshold: 3000ms)
  First Paint: 456.78ms
  First Contentful Paint: 523.45ms (threshold: 1800ms)
  Largest Contentful Paint: 678.90ms (threshold: 2500ms)
```

### Database Query Test Output

```
Get Reviews by Rating:
  Average: 145.67ms
  Min: 132.45ms
  Max: 189.23ms
  Threshold: 300ms
```

## Performance Thresholds

Thresholds are based on:
- **Web Vitals**: Google's Core Web Vitals recommendations
- **User Experience**: Research on acceptable response times
- **Industry Standards**: Common SaaS application benchmarks

### Why These Thresholds?

- **< 100ms**: Feels instantaneous to users
- **< 300ms**: Slight delay but still feels responsive
- **< 1000ms**: User's flow of thought stays uninterrupted
- **< 3000ms**: Maximum acceptable for complex operations

## Best Practices

### Before Running Tests

1. **Ensure stable environment**: Close unnecessary applications
2. **Use consistent hardware**: Run on same machine for comparison
3. **Check network conditions**: Stable internet connection
4. **Warm up the system**: Run once to warm caches, then run again for actual measurements

### Interpreting Results

1. **Look at trends**: Single test results can vary; look for patterns over multiple runs
2. **Check variance**: High variance indicates inconsistent performance
3. **Compare against baseline**: Track performance over time
4. **Investigate regressions**: If tests start failing, investigate changes

### Maintaining Tests

1. **Update thresholds carefully**: Only increase thresholds if absolutely necessary
2. **Add new tests**: When adding features, add corresponding performance tests
3. **Keep tests isolated**: Each test should be independent
4. **Mock external services**: For consistent and fast testing

## Continuous Integration

### Running in CI/CD

Add to your CI/CD pipeline:

```yaml
- name: Run Performance Tests
  run: npm run test:perf

- name: Upload Performance Report
  uses: actions/upload-artifact@v2
  with:
    name: performance-report
    path: playwright-report-performance/
```

### Performance Budgets

Consider failing builds if performance degrades significantly:

```javascript
// In CI environment
if (averageResponseTime > threshold * 1.5) {
  throw new Error('Performance regression detected!');
}
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in configuration files
- Check if dev server is running
- Verify database connection

### Inconsistent Results

- Run tests multiple times for average
- Check system resources (CPU, memory)
- Ensure no other heavy processes running

### Database Tests Failing

- Verify Supabase credentials
- Check database connection
- Ensure tables exist
- Check RLS policies

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Playwright Performance Testing](https://playwright.dev/docs/test-assertions)
- [Jest Performance Testing](https://jestjs.io/docs/timer-mocks)
- [Supabase Performance](https://supabase.com/docs/guides/platform/performance)

## Contributing

When adding new performance tests:

1. Follow existing test structure
2. Use appropriate thresholds
3. Add descriptive test names
4. Include console logging for results
5. Update this README if adding new test categories
