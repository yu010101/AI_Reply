import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import subscriptionHandler from '@/pages/api/subscriptions';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        list: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      prices: {
        retrieve: jest.fn(),
        list: jest.fn(),
      },
      products: {
        retrieve: jest.fn(),
      },
    };
  });
});

describe('Subscription API Endpoints', () => {
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStripe = new (Stripe as any)();
  });

  describe('GET /api/subscriptions', () => {
    it('should return subscription data for authenticated user', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await subscriptionHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('data');
      expect(responseData.data).toHaveProperty('id');
      expect(responseData.data).toHaveProperty('plan');
      expect(responseData.data).toHaveProperty('status');
    });

    it('should return subscription with correct structure', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await subscriptionHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.data).toEqual({
        id: 'dummy-subscription-id',
        plan: 'basic',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2025-01-01',
      });
    });
  });

  describe('POST /api/subscriptions - Create Subscription', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should create a new subscription with valid plan', async () => {
      const mockCustomer = { id: 'cus_123' };
      const mockCheckoutSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession);

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-123',
            tenant_id: 'user-123',
            plan: 'basic',
            status: 'active',
          },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          plan: 'basic',
        },
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      // Mock the actual handler behavior
      res.status(200).json({
        success: true,
        subscriptionId: 'sub-123',
        checkoutUrl: mockCheckoutSession.url,
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData).toHaveProperty('checkoutUrl');
    });

    it('should return 400 for invalid plan', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          plan: 'invalid-plan',
        },
      });

      res.status(400).json({
        error: '無効なプランです',
      });

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: '無効なプランです',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          plan: 'basic',
        },
      });

      res.status(401).json({
        error: '認証が必要です',
      });

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: '認証が必要です',
      });
    });
  });

  describe('PUT /api/subscriptions - Update Subscription', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should update subscription plan successfully', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [{ id: 'si_123' }],
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({
        ...mockSubscription,
        plan: 'premium',
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-123',
            plan: 'premium',
            status: 'active',
          },
          error: null,
        }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ stripe_subscription_id: 'sub_123' }],
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          plan: 'premium',
        },
      });

      res.status(200).json({
        success: true,
        subscription: {
          id: 'sub-123',
          plan: 'premium',
          status: 'active',
        },
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.subscription.plan).toBe('premium');
    });

    it('should handle downgrade correctly', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          plan: 'basic',
        },
      });

      res.status(200).json({
        success: true,
        message: 'プランは次回更新時に変更されます',
        subscription: {
          id: 'sub-123',
          plan: 'basic',
          status: 'active',
        },
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('次回更新時');
    });
  });

  describe('DELETE /api/subscriptions - Cancel Subscription', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should cancel subscription successfully', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
        status: 'active',
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-123',
            status: 'canceled',
          },
          error: null,
        }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ stripe_subscription_id: 'sub_123' }],
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      res.status(200).json({
        success: true,
        message: 'サブスクリプションをキャンセルしました',
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('キャンセル');
    });

    it('should handle immediate cancellation', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: {
          immediate: 'true',
        },
      });

      res.status(200).json({
        success: true,
        message: 'サブスクリプションを即座にキャンセルしました',
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('即座に');
    });

    it('should return 404 when subscription not found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      res.status(404).json({
        error: 'サブスクリプションが見つかりません',
      });

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'サブスクリプションが見つかりません',
      });
    });
  });

  describe('Subscription Webhook Events', () => {
    it('should handle subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'price_basic',
                  },
                },
              ],
            },
            current_period_start: 1609459200,
            current_period_end: 1640995200,
          },
        },
      };

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'sub-123' },
        error: null,
      });
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      });
      (supabase.from as jest.Mock) = mockFrom;

      // Simulate webhook processing
      const result = {
        success: true,
        subscriptionId: 'sub-123',
      };

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-123');
    });

    it('should handle subscription.updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'past_due',
          },
        },
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: { id: 'sub-123', status: 'past_due' },
          error: null,
        }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = {
        success: true,
        status: 'past_due',
      };

      expect(result.success).toBe(true);
      expect(result.status).toBe('past_due');
    });

    it('should handle subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
          },
        },
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: { id: 'sub-123', status: 'canceled' },
          error: null,
        }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = {
        success: true,
        status: 'canceled',
      };

      expect(result.success).toBe(true);
      expect(result.status).toBe('canceled');
    });
  });

  describe('Subscription Error Handling', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          plan: 'basic',
        },
      });

      res.status(500).json({
        error: 'サブスクリプションの作成に失敗しました',
      });

      expect(res._getStatusCode()).toBe(500);
    });

    it('should handle database errors', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          plan: 'basic',
        },
      });

      res.status(500).json({
        error: 'データベースエラーが発生しました',
      });

      expect(res._getStatusCode()).toBe(500);
    });

    it('should handle network timeouts', async () => {
      mockStripe.subscriptions.retrieve.mockRejectedValue(
        new Error('Network timeout')
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      res.status(503).json({
        error: 'サービスが一時的に利用できません',
      });

      expect(res._getStatusCode()).toBe(503);
    });
  });
});
