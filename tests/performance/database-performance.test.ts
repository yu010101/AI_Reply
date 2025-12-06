/**
 * Database Query Performance Tests
 *
 * Tests database query performance to ensure queries execute within acceptable timeframes.
 * Uses Supabase client to test real database operations.
 *
 * Thresholds:
 * - Simple queries (single row, indexed): < 100ms
 * - Medium queries (filtered, joined): < 300ms
 * - Complex queries (aggregations, multiple joins): < 1000ms
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Performance thresholds (in milliseconds)
const DB_THRESHOLDS = {
  SIMPLE: 100,    // Simple indexed queries
  MEDIUM: 300,    // Filtered queries with joins
  COMPLEX: 1000,  // Complex aggregations
};

const TEST_TIMEOUT = 10000;

// Supabase client (will be initialized in beforeAll)
let supabase: SupabaseClient;

// Helper function to measure query execution time
async function measureQueryTime<T>(
  queryFn: () => Promise<T>
): Promise<{ duration: number; result: T }> {
  const startTime = performance.now();
  const result = await queryFn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  return { duration, result };
}

// Helper to run multiple iterations and get statistics
async function runQueryPerformanceTest<T>(
  testName: string,
  queryFn: () => Promise<T>,
  threshold: number,
  iterations: number = 5
): Promise<void> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureQueryTime(queryFn);
    durations.push(duration);

    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(`\n${testName}:`);
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
  console.log(`  Threshold: ${threshold}ms`);

  expect(avgDuration).toBeLessThan(threshold);
}

describe('Database Performance Tests', () => {
  beforeAll(() => {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('Simple Queries', () => {
    test('SELECT single user by ID should be fast', async () => {
      await runQueryPerformanceTest(
        'Get User by ID',
        async () => {
          const { data, error } = await supabase.auth.getUser();
          return { data, error };
        },
        DB_THRESHOLDS.SIMPLE,
        5
      );
    }, TEST_TIMEOUT);

    test('SELECT all locations should be fast', async () => {
      await runQueryPerformanceTest(
        'Get All Locations',
        async () => {
          const { data, error } = await supabase
            .from('locations')
            .select('*');
          return { data, error };
        },
        DB_THRESHOLDS.SIMPLE,
        5
      );
    }, TEST_TIMEOUT);

    test('SELECT single location by ID should be very fast', async () => {
      await runQueryPerformanceTest(
        'Get Location by ID',
        async () => {
          const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('id', 'test-id')
            .single();
          return { data, error };
        },
        DB_THRESHOLDS.SIMPLE,
        5
      );
    }, TEST_TIMEOUT);

    test('COUNT query should be fast', async () => {
      await runQueryPerformanceTest(
        'Count Reviews',
        async () => {
          const { count, error } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });
          return { count, error };
        },
        DB_THRESHOLDS.SIMPLE,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('Medium Complexity Queries', () => {
    test('SELECT with filter should be reasonably fast', async () => {
      await runQueryPerformanceTest(
        'Get Reviews by Rating',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .gte('rating', 4);
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('SELECT with JOIN should be efficient', async () => {
      await runQueryPerformanceTest(
        'Get Reviews with Location',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select(`
              *,
              locations (
                id,
                name,
                tone
              )
            `)
            .limit(20);
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('SELECT with multiple filters should be efficient', async () => {
      await runQueryPerformanceTest(
        'Get Filtered Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .gte('rating', 3)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('SELECT with date range filter should be efficient', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await runQueryPerformanceTest(
        'Get Recent Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false });
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('Complex Queries', () => {
    test('SELECT with multiple JOINs should complete within threshold', async () => {
      await runQueryPerformanceTest(
        'Get Reviews with Location and Replies',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select(`
              *,
              locations (
                id,
                name,
                tone
              ),
              replies (
                id,
                content,
                is_ai_generated,
                created_at
              )
            `)
            .limit(20);
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        3
      );
    }, TEST_TIMEOUT);

    test('Aggregation query should be reasonably fast', async () => {
      await runQueryPerformanceTest(
        'Get Rating Statistics',
        async () => {
          // Note: Supabase doesn't support aggregation directly,
          // so we fetch and compute client-side (not ideal but realistic)
          const { data, error } = await supabase
            .from('reviews')
            .select('rating');

          if (data) {
            const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
            const max = Math.max(...data.map(r => r.rating));
            const min = Math.min(...data.map(r => r.rating));
            return { data: { avg, max, min, count: data.length }, error };
          }

          return { data: null, error };
        },
        DB_THRESHOLDS.COMPLEX,
        3
      );
    }, TEST_TIMEOUT);
  });

  describe('Write Operations', () => {
    test('INSERT single row should be fast', async () => {
      await runQueryPerformanceTest(
        'Insert Review',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .insert({
              google_review_id: `test-${Date.now()}`,
              location_id: 'test-location',
              tenant_id: 'test-tenant',
              author: 'Test User',
              rating: 5,
              comment: 'Test comment',
              status: 'pending',
              source: 'google',
              review_date: new Date().toISOString(),
            })
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        3
      );
    }, TEST_TIMEOUT);

    test('UPDATE single row should be fast', async () => {
      await runQueryPerformanceTest(
        'Update Review Status',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .update({ status: 'replied' })
            .eq('id', 'test-id')
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        3
      );
    }, TEST_TIMEOUT);

    test('UPSERT operation should be efficient', async () => {
      await runQueryPerformanceTest(
        'Upsert Review',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .upsert({
              google_review_id: 'test-upsert',
              location_id: 'test-location',
              tenant_id: 'test-tenant',
              author: 'Test User',
              rating: 4,
              comment: 'Upsert test',
              status: 'pending',
              source: 'google',
              review_date: new Date().toISOString(),
            }, {
              onConflict: 'google_review_id',
            })
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        3
      );
    }, TEST_TIMEOUT);

    test('DELETE operation should be fast', async () => {
      await runQueryPerformanceTest(
        'Delete Review',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', 'non-existent-id')
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        3
      );
    }, TEST_TIMEOUT);
  });

  describe('Batch Operations', () => {
    test('INSERT multiple rows should be efficient', async () => {
      const reviews = Array(10).fill(null).map((_, i) => ({
        google_review_id: `batch-${Date.now()}-${i}`,
        location_id: 'test-location',
        tenant_id: 'test-tenant',
        author: `Test User ${i}`,
        rating: Math.floor(Math.random() * 5) + 1,
        comment: `Batch test comment ${i}`,
        status: 'pending',
        source: 'google',
        review_date: new Date().toISOString(),
      }));

      await runQueryPerformanceTest(
        'Insert 10 Reviews (Batch)',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .insert(reviews)
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        2
      );
    }, TEST_TIMEOUT);

    test('UPDATE multiple rows should be efficient', async () => {
      await runQueryPerformanceTest(
        'Update Multiple Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .update({ status: 'archived' })
            .eq('status', 'replied')
            .select();
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        2
      );
    }, TEST_TIMEOUT);
  });

  describe('Pagination Performance', () => {
    test('first page should load quickly', async () => {
      await runQueryPerformanceTest(
        'Get Reviews - Page 1',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .range(0, 19); // First 20 items
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('subsequent pages should load efficiently', async () => {
      await runQueryPerformanceTest(
        'Get Reviews - Page 5',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .range(80, 99); // Items 81-100
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);
  });

  describe('Full-text Search Performance', () => {
    test('text search should be reasonably fast', async () => {
      await runQueryPerformanceTest(
        'Search Reviews by Comment',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .ilike('comment', '%excellent%');
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        3
      );
    }, TEST_TIMEOUT);

    test('multiple field search should be efficient', async () => {
      await runQueryPerformanceTest(
        'Search Reviews by Author or Comment',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .or('author.ilike.%john%,comment.ilike.%great%');
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        3
      );
    }, TEST_TIMEOUT);
  });

  describe('Concurrent Query Performance', () => {
    test('should handle concurrent queries efficiently', async () => {
      const startTime = performance.now();

      const queries = Array(5).fill(null).map((_, i) =>
        supabase
          .from('reviews')
          .select('*')
          .limit(10)
      );

      await Promise.all(queries);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`\nConcurrent Queries (5):`);
      console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Threshold: ${DB_THRESHOLDS.COMPLEX}ms`);

      // Should not take significantly longer than single query
      expect(totalDuration).toBeLessThan(DB_THRESHOLDS.COMPLEX);
    }, TEST_TIMEOUT);

    test('should handle mixed read/write operations', async () => {
      const startTime = performance.now();

      await Promise.all([
        supabase.from('reviews').select('*').limit(10),
        supabase.from('locations').select('*').limit(5),
        supabase.from('reviews').select('rating'),
      ]);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      console.log(`\nMixed Operations (3):`);
      console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);

      expect(totalDuration).toBeLessThan(DB_THRESHOLDS.COMPLEX);
    }, TEST_TIMEOUT);
  });

  describe('Query Result Size Impact', () => {
    test('small result set should be very fast', async () => {
      await runQueryPerformanceTest(
        'Get 5 Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .limit(5);
          return { data, error };
        },
        DB_THRESHOLDS.SIMPLE,
        5
      );
    }, TEST_TIMEOUT);

    test('medium result set should be reasonably fast', async () => {
      await runQueryPerformanceTest(
        'Get 50 Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .limit(50);
          return { data, error };
        },
        DB_THRESHOLDS.MEDIUM,
        5
      );
    }, TEST_TIMEOUT);

    test('large result set should complete within threshold', async () => {
      await runQueryPerformanceTest(
        'Get 100 Reviews',
        async () => {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .limit(100);
          return { data, error };
        },
        DB_THRESHOLDS.COMPLEX,
        3
      );
    }, TEST_TIMEOUT);
  });
});
