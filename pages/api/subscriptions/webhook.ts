import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { handleStripeWebhook } from '@/services/stripe/StripeService';

// Bodyパーサーを無効化（Webhookのrawデータアクセスのため）
export const config = {
  api: {
    bodyParser: false,
  },
};

// Stripeインスタンスを初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // リクエストボディを取得
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    // イベントを検証
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Webhookイベントを処理
    const result = await handleStripeWebhook(event);

    if (!result) {
      console.warn(`Webhook handling failed for event type ${event.type}`);
      return res.status(500).json({ error: 'Webhook handling failed' });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
} 