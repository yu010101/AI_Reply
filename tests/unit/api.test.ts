import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/ai-reply/generate';
import subscriptionHandler from '@/pages/api/subscriptions/create';
import usageMetricsHandler from '@/pages/api/usage-metrics';

// モックの設定
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => ({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: {
            id: 'test-id',
            name: 'Test Name',
            plan: 'basic',
          },
          error: null,
        })),
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-id',
              name: 'Test Name',
              plan: 'basic',
            },
            error: null,
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-id',
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'test-id',
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'テスト返信',
                },
              },
            ],
          }),
        },
      },
    };
  });
});

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      customers: {
        create: jest.fn().mockResolvedValue({
          id: 'cus_test123',
        }),
      },
      prices: {
        create: jest.fn().mockResolvedValue({
          id: 'price_test123',
        }),
      },
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
    };
  });
});

jest.mock('@/utils/usage-metrics', () => ({
  recordUsage: jest.fn().mockResolvedValue(true),
}));

describe('AI返信生成API', () => {
  it('正常なリクエストで返信が生成される', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        reviewId: 'test-review-id',
        tone: 'friendly',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        reply: 'テスト返信',
        reviewId: 'test-review-id',
      })
    );
  });

  it('認証されていない場合は401エラーを返す', async () => {
    // 認証モックをオーバーライド
    jest.spyOn(require('@/utils/supabase').supabase.auth, 'getSession').mockReturnValueOnce({
      data: { session: null },
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        reviewId: 'test-review-id',
        tone: 'friendly',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      error: '認証されていません',
    });
  });

  it('レビューIDがない場合は400エラーを返す', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        tone: 'friendly',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'レビューIDが必要です',
    });
  });
});

describe('サブスクリプション作成API', () => {
  it('正常なリクエストでチェックアウトURLが返される', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        planId: 'basic',
      },
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    await subscriptionHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      url: 'https://checkout.stripe.com/test',
    });
  });

  it('無効なプランIDの場合は400エラーを返す', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        planId: 'invalid-plan',
      },
    });

    await subscriptionHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: '無効なプランです',
    });
  });
});

describe('使用量メトリクスAPI', () => {
  it('使用量の記録に成功する', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        metric_name: 'ai_reply',
        count: 1,
      },
    });

    await usageMetricsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('使用量の取得に成功する', async () => {
    jest.spyOn(require('@/utils/supabase').supabase, 'from').mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'test-metric-id',
            metric_name: 'ai_reply',
            count: 10,
          },
        ],
        error: null,
      }),
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {
        metric: 'ai_reply',
      },
    });

    await usageMetricsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual([
      {
        id: 'test-metric-id',
        metric_name: 'ai_reply',
        count: 10,
      },
    ]);
  });
}); 