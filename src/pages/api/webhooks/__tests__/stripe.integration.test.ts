import { NextApiRequest, NextApiResponse } from 'next';
import { webhookHandler } from '../stripe';
import { supabase } from '../../../../utils/supabase';
import { stripe } from '../../../../utils/stripe';

// モックの設定
jest.mock('../../../../utils/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock('../../../../utils/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

describe('Stripe Webhook Integration', () => {
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
        'stripe-signature': 'test-signature',
      },
      body: Buffer.from('test-body'),
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Checkout Session Completed', () => {
    it('should handle successful checkout session', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              userId: 'test-user-id',
            },
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        stripe_subscription_id: 'sub_test_123',
        user_id: 'test-user-id',
        status: 'active',
      }));
    });
  });

  describe('Subscription Updated', () => {
    it('should handle subscription status change', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'past_due',
            customer: 'cus_test_123',
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(supabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'past_due',
      }));
    });
  });

  describe('Subscription Deleted', () => {
    it('should handle subscription cancellation', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(supabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'canceled',
      }));
    });
  });

  describe('Invoice Payment', () => {
    it('should handle successful payment', async () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            amount_paid: 1000,
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        stripe_invoice_id: 'in_test_123',
        amount: 1000,
        status: 'succeeded',
      }));
    });

    it('should handle failed payment', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            amount_due: 1000,
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('payments');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        stripe_invoice_id: 'in_test_123',
        amount: 1000,
        status: 'failed',
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid signature', async () => {
      (stripe.webhooks.constructEvent as jest.Mock).mockRejectedValue(
        new Error('Invalid signature')
      );

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      }));
    });

    it('should handle database errors', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              userId: 'test-user-id',
            },
          },
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockResolvedValue(event);
      (supabase.insert as jest.Mock).mockResolvedValue({ error: new Error('Database error') });

      await webhookHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Database error',
        code: 'DATABASE_ERROR',
      }));
    });
  });
}); 