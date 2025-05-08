import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../stripe';
import { serverApi } from '@/utils/stripe';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';

// モックの設定
jest.mock('@/utils/stripe', () => ({
  serverApi: {
    handleWebhookEvent: jest.fn(),
  },
}));
jest.mock('@/utils/supabase');

const mockHandleWebhookEvent = serverApi.handleWebhookEvent as jest.MockedFunction<typeof serverApi.handleWebhookEvent>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Stripe Webhook Handler', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: 'test_body',
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should return 405 for non-POST requests', async () => {
      mockReq.method = 'GET';
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      });
    });

    it('should return 400 when no signature is provided', async () => {
      mockReq.headers = {};
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No signature provided',
        code: 'NO_SIGNATURE',
      });
    });
  });

  describe('Checkout Session Completed', () => {
    const mockSession = {
      id: 'test_session_id',
      subscription: 'test_subscription_id',
      metadata: {
        userId: 'test_user_id',
        planId: 'test_plan_id',
      },
    };

    beforeEach(() => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'checkout.session.completed',
        data: {
          object: mockSession,
        },
      } as any);
    });

    it('should handle successful checkout session', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(jsonMock).toHaveBeenCalledWith({ received: true });
    });

    it('should handle missing metadata', async () => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            ...mockSession,
            metadata: {},
          },
        },
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required metadata',
        code: 'INVALID_METADATA',
        details: { userId: undefined, planId: undefined },
      });
    });
  });

  describe('Subscription Updated', () => {
    const mockSubscription = {
      id: 'test_subscription_id',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
    };

    beforeEach(() => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription,
        },
      } as any);
    });

    it('should handle subscription update', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(jsonMock).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('Payment Processing', () => {
    const mockInvoice = {
      id: 'test_invoice_id',
      subscription: 'test_subscription_id',
      amount_paid: 1000,
      amount_due: 1000,
      currency: 'jpy',
    };

    it('should handle successful payment', async () => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: mockInvoice,
        },
      } as any);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
      expect(jsonMock).toHaveBeenCalledWith({ received: true });
    });

    it('should handle failed payment', async () => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'invoice.payment_failed',
        data: {
          object: mockInvoice,
        },
      } as any);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
      expect(jsonMock).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockHandleWebhookEvent.mockResolvedValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'test_session_id',
            subscription: 'test_subscription_id',
            metadata: {
              userId: 'test_user_id',
              planId: 'test_plan_id',
            },
          },
        },
      } as any);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
      } as any);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to save subscription',
        code: 'DATABASE_ERROR',
        details: { error: expect.any(Error) },
      });
    });

    it('should handle retryable errors', async () => {
      mockHandleWebhookEvent.mockRejectedValue(new Stripe.errors.StripeConnectionError());

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        retryAfter: 30,
      });
    });
  });
}); 