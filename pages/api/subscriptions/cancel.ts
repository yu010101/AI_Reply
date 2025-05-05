import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/utils/supabase';

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
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: '必須パラメータが不足しています' });
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

    // サブスクリプション情報を取得
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .eq('tenant_id', userId)
      .single();

    if (subscriptionError) {
      return res.status(400).json({ error: 'サブスクリプション情報の取得に失敗しました' });
    }

    // サブスクリプションをキャンセル
    await stripe.subscriptions.cancel(subscriptionId);

    // データベースのサブスクリプション情報を更新
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    // テナント情報を更新
    await supabase
      .from('tenants')
      .update({
        plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    return res.status(500).json({ error: 'サブスクリプションのキャンセルに失敗しました' });
  }
} 