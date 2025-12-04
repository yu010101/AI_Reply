import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/utils/supabase';
import { PLAN_PRICES } from '@/constants/plan';
import { logger } from '@/utils/logger';

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
    const { planId, customerId } = req.body;

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

    if (tenantError) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    let stripeCustomerId = tenant.stripe_customer_id || customerId;

    // Stripeの顧客IDがない場合は作成
    if (!stripeCustomerId) {
      // ユーザー情報を取得
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('tenant_id', userId)
        .eq('role', 'admin')
        .single();

      if (!userData) {
        return res.status(400).json({ error: 'ユーザー情報の取得に失敗しました' });
      }

      // Stripe顧客を作成
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          tenantId: userId,
        },
      });

      stripeCustomerId = customer.id;

      // テナントにStripe顧客IDを保存
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
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

    // チェックアウトセッションを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/account/billing?success=true`,
      cancel_url: `${req.headers.origin}/account/billing?canceled=true`,
      subscription_data: {
        metadata: {
          tenantId: userId,
          plan: planId,
        },
      },
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    logger.error('サブスクリプション作成エラー', { error });
    return res.status(500).json({ error: 'サブスクリプションの作成に失敗しました' });
  }
} 