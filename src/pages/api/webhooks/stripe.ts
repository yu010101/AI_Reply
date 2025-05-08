import { NextApiRequest, NextApiResponse } from 'next';
import { serverApi } from '@/utils/stripe';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';

// カスタムエラークラスの定義
class WebhookError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'WEBHOOK_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

// エラーログの型定義
type ErrorLog = {
  timestamp: string;
  error: {
    name: string;
    message: string;
    code: string;
    details?: any;
  };
  event?: {
    type: string;
    id: string;
  };
  request?: {
    method: string;
    headers: Record<string, string>;
  };
};

// エラーログを記録する関数
async function logError(error: WebhookError, event?: StripeWebhookEvent, req?: NextApiRequest) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
    },
  };

  if (event) {
    errorLog.event = {
      type: event.type,
      id: (event.data.object as any).id,
    };
  }

  if (req) {
    errorLog.request = {
      method: req.method || '',
      headers: req.headers as Record<string, string>,
    };
  }

  // エラーログをデータベースに保存
  await supabase.from('error_logs').insert(errorLog);
  console.error('Webhook error:', errorLog);
}

// リトライ可能なエラーかどうかを判定する関数
function isRetryableError(error: any): boolean {
  return (
    error instanceof Stripe.errors.StripeConnectionError ||
    error instanceof Stripe.errors.StripeAPIError ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

export const config = {
  api: {
    bodyParser: false,
  },
};

type StripeWebhookEvent = {
  type: string;
  data: {
    object: Stripe.Event.Data.Object;
  };
};

type CheckoutSession = Stripe.Checkout.Session & {
  metadata: {
    userId: string;
    planId: string;
  };
};

type Invoice = Stripe.Invoice & {
  subscription: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'No signature provided', code: 'NO_SIGNATURE' });
  }

  try {
    const event = await serverApi.handleWebhookEvent(req.body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const { userId, planId } = session.metadata || {};

        if (!userId || !planId) {
          throw new Error('Missing required metadata');
        }

        const { error } = await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: session.subscription,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        if (error) {
          throw new Error('Failed to save subscription');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          throw new Error('Failed to update subscription');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          throw new Error('Failed to cancel subscription');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        
        if (!invoice.subscription) {
          throw new Error('Missing subscription ID');
        }

        const { error } = await supabase.from('payments').insert({
          subscription_id: invoice.subscription,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          payment_date: new Date().toISOString(),
        });

        if (error) {
          throw new Error('Failed to record payment');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        
        if (!invoice.subscription) {
          throw new Error('Missing subscription ID');
        }

        const { error } = await supabase.from('payments').insert({
          subscription_id: invoice.subscription,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          payment_date: new Date().toISOString(),
        });

        if (error) {
          throw new Error('Failed to record failed payment');
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);

    if (error.message === 'Missing required metadata') {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_METADATA',
        details: { userId: undefined, planId: undefined },
      });
    }

    if (error.message === 'Missing subscription ID') {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_INVOICE',
        details: { error },
      });
    }

    if (error.type === 'StripeSignatureVerificationError') {
      return res.status(400).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    // リトライ可能なエラーの処理
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error instanceof Stripe.errors.StripeConnectionError ||
      error instanceof Stripe.errors.StripeAPIError
    ) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        retryAfter: 30,
      });
    }

    // データベースエラーの処理
    if (error.message.startsWith('Failed to')) {
      return res.status(500).json({
        error: error.message,
        code: 'DATABASE_ERROR',
        details: { error },
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: { error },
    });
  }
} 