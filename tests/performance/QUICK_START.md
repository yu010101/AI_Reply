# Performance Tests - Quick Start Guide

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Set up environment variables (copy `.env.example` to `.env`):
   ```bash
   cp tests/performance/.env.example tests/performance/.env
   ```

## Running Tests

### Run All Performance Tests (Recommended)

```bash
npm run test:perf
```

This will run all three test suites in sequence:
1. API Performance Tests
2. Page Load Performance Tests
3. Database Performance Tests

**Expected Duration:** 5-10 minutes

### Run Individual Test Suites

**API Tests Only:**
```bash
npm run test:perf:api
```
Duration: ~2 minutes

**Page Load Tests Only:**
```bash
npm run test:perf:page
```
Duration: ~3 minutes

**Database Tests Only:**
```bash
npm run test:perf:db
```
Duration: ~2 minutes

## Interpreting Results

### Successful Test Output

```
✓ API Performance Tests > Authentication Endpoints > POST /api/auth/login - should respond within 500ms

Login API:
  Average: 245.32ms
  Min: 198.45ms
  Max: 312.78ms
  Threshold: 500ms
```

**This means:** The login API is performing well, averaging 245ms which is well below the 500ms threshold.

### Failed Test Output

```
✗ API Performance Tests > Data Retrieval > GET /api/tenants - should respond within 1000ms

Get Tenants API:
  Average: 1250.67ms
  Min: 1100.23ms
  Max: 1450.89ms
  Threshold: 1000ms
```

**This means:** The tenants API is too slow, averaging 1250ms which exceeds the 1000ms threshold. This needs optimization.

## Common Issues

### Issue: "Connection refused" or "ECONNREFUSED"

**Solution:** Make sure the dev server is running:
```bash
npm run dev
```

### Issue: "Supabase URL not configured"

**Solution:** Set up environment variables in `.env`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### Issue: Tests are inconsistent

**Solution:**
1. Close resource-intensive applications
2. Run tests multiple times and look at the average
3. Ensure stable internet connection

### Issue: Tests timeout

**Solution:**
1. Check if the application is running properly
2. Increase timeout in config files if necessary
3. Check database connectivity

## Performance Thresholds

| Category | Threshold | Rationale |
|----------|-----------|-----------|
| Fast API | < 500ms | Simple operations should feel instant |
| Medium API | < 1000ms | Complex operations should stay responsive |
| Heavy API | < 3000ms | External APIs can take longer but stay reasonable |
| Page FCP | < 1800ms | Users should see content quickly |
| Page LCP | < 2500ms | Main content should load fast |
| Simple DB | < 100ms | Indexed queries should be very fast |
| Medium DB | < 300ms | Filtered queries should be quick |
| Complex DB | < 1000ms | Aggregations can take longer but stay under 1s |

## Tips for Better Results

1. **Run tests when system is idle:** Close browsers, IDEs, and other heavy applications
2. **Use a wired connection:** WiFi can introduce variability
3. **Run multiple times:** Look for consistency across runs
4. **Check system resources:** Ensure CPU and memory aren't constrained
5. **Clear caches between runs:** For more accurate cold-start measurements

## Next Steps

After running tests:

1. **Review the HTML report:**
   ```bash
   npm run test:perf:report
   ```

2. **Identify bottlenecks:** Look for tests that are close to or exceeding thresholds

3. **Optimize slow operations:**
   - Add database indexes
   - Optimize queries
   - Add caching
   - Reduce payload sizes

4. **Track over time:** Run tests regularly to catch performance regressions

5. **Set up CI/CD:** Add performance tests to your continuous integration pipeline

## Getting Help

- Check the main [README.md](./README.md) for detailed documentation
- Review test files for specific test implementations
- Check [performance-helpers.ts](./utils/performance-helpers.ts) for utility functions

## Example Workflow

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run performance tests
npm run test:perf

# 3. Review results in console

# 4. Open detailed HTML report
npm run test:perf:report

# 5. If tests fail, investigate and optimize

# 6. Re-run tests to verify improvements
npm run test:perf
```

## Performance Testing Checklist

- [ ] Development server is running
- [ ] Environment variables are configured
- [ ] System resources are available (not running heavy applications)
- [ ] Stable internet connection
- [ ] Database is accessible
- [ ] No other tests running simultaneously
- [ ] Ready to review and act on results

Happy testing!
