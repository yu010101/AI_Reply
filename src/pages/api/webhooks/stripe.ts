import { NextApiRequest, NextApiResponse } from 'next';
import { serverApi } from '@/utils/stripe';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';
import { securityMiddleware } from '@/utils/security';
import { errorMonitoringMiddleware, logError } from '@/utils/monitoring';

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
async function logWebhookError(
  error: Error,
  event: StripeWebhookEvent | undefined,
  req: NextApiRequest
) {
  await logError(error, {
    event: event ? {
      type: event.type,
      id: event.id,
    } : undefined,
    request: {
      method: req.method,
      headers: req.headers,
    },
  });
}

// リトライ可能なエラーかどうかを判定する関数
function isRetryableError(error: Error): boolean {
  if (error instanceof WebhookError) {
    return error.statusCode === 503;
  }

  const code = (error as any).code;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes('timeout') || message.includes('connection');
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Stripeのイベント型定義
type StripeWebhookEvent = Stripe.Event & {
  id: string;
  type: string;
  data: {
    object: any;
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
  last_payment_error?: {
    message: string;
  };
  amount_paid: number;
  amount_due: number;
};

async function webhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
    return;
  }

  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({
      error: 'No signature provided',
      code: 'NO_SIGNATURE',
    });
    return;
  }

  let event: StripeWebhookEvent | undefined;

  try {
    event = await serverApi.handleWebhookEvent(req.body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.metadata?.userId) {
          res.status(400).json({
            error: 'Missing required metadata',
            code: 'INVALID_METADATA',
            details: { userId: session.metadata?.userId },
          });
          return;
        }

        try {
          await supabase.from('subscriptions').insert({
            userId: session.metadata.userId,
            status: 'active',
            priceId: session.metadata.priceId,
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
          });
        } catch (error) {
          throw new WebhookError(
            'Failed to save subscription',
            500,
            'DATABASE_ERROR',
            { error }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              updatedAt: new Date().toISOString(),
            })
            .eq('subscriptionId', subscription.id);

          if (error) {
            throw new WebhookError(
              'Failed to update subscription',
              500,
              'DATABASE_ERROR',
              { error }
            );
          }
        } catch (error) {
          throw new WebhookError(
            'Failed to update subscription',
            500,
            'DATABASE_ERROR',
            { error }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceledAt: new Date().toISOString(),
            })
            .eq('subscriptionId', subscription.id);

          if (error) {
            throw new WebhookError(
              'Failed to cancel subscription',
              500,
              'DATABASE_ERROR',
              { error }
            );
          }
        } catch (error) {
          throw new WebhookError(
            'Failed to cancel subscription',
            500,
            'DATABASE_ERROR',
            { error }
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Invoice;
        try {
          const { error } = await supabase.from('payments').insert({
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid,
            status: 'succeeded',
            invoiceId: invoice.id,
          });

          if (error) {
            throw new WebhookError(
              'Failed to record payment',
              500,
              'DATABASE_ERROR',
              { error }
            );
          }
        } catch (error) {
          throw new WebhookError(
            'Failed to record payment',
            500,
            'DATABASE_ERROR',
            { error }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Invoice;
        try {
          const { error } = await supabase.from('payments').insert({
            subscriptionId: invoice.subscription,
            amount: invoice.amount_due,
            status: 'failed',
            invoiceId: invoice.id,
            failureReason: invoice.last_payment_error?.message,
          });

          if (error) {
            throw new WebhookError(
              'Failed to record failed payment',
              500,
              'DATABASE_ERROR',
              { error }
            );
          }
        } catch (error) {
          throw new WebhookError(
            'Failed to record failed payment',
            500,
            'DATABASE_ERROR',
            { error }
          );
        }
        break;
      }

      default: {
        throw new WebhookError(
          `Unhandled event type: ${event.type}`,
          400,
          'UNHANDLED_EVENT'
        );
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    // エラーログを記録
    await logWebhookError(error, event, req);

    // データベースエラーの場合
    if (error instanceof WebhookError && error.code === 'DATABASE_ERROR') {
      res.status(500).json({
        error: error.message,
        code: 'DATABASE_ERROR',
        details: error.details,
      });
      return;
    }

    // リトライ可能なエラーの場合は503を返す
    if (isRetryableError(error)) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        details: { retryAfter: 30 },
      });
      return;
    }

    // その他のエラー
    res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code || 'INTERNAL_ERROR',
    });
  }
}

// webhookHandlerをexportに変更
export { webhookHandler };
export default securityMiddleware(errorMonitoringMiddleware(webhookHandler)); 