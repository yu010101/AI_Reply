import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/utils/supabase';
import { PLAN_PRICES } from '@/constants/plan';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = authSession.user.id;
    const { subscriptionId, planId } = req.body;

    if (!subscriptionId || !planId) {
      return res.status(400).json({ error: '必須パラメータが不足しています' });
    }

    // プランIDを検証
    const plan = planId as keyof typeof PLAN_PRICES;
    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ error: '無効なプランです' });
    }

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (tenantError || !tenant.stripe_customer_id) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    // 月額料金を設定
    const priceData = {
      currency: 'jpy',
      unit_amount: PLAN_PRICES[plan],
      recurring: { interval: 'month' as Stripe.PriceCreateParams.Recurring.Interval },
      product_data: {
        name: `RevAI Concierge ${plan.charAt(0).toUpperCase() + plan.slice(1)}プラン`,
      },
    };

    // 価格オブジェクトを作成
    const price = await stripe.prices.create(priceData);

    // サブスクリプションアイテムを取得
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    // サブスクリプションを更新
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: price.id,
        },
      ],
      metadata: {
        plan: planId,
      },
    });

    // データベースのサブスクリプション情報を更新
    await supabase
      .from('subscriptions')
      .update({
        plan: planId,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('サブスクリプション更新エラー:', error);
    return res.status(500).json({ error: 'サブスクリプションの更新に失敗しました' });
  }
} 