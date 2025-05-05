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

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (tenantError || !tenant.stripe_customer_id) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    // 顧客ポータルセッションを作成
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${req.headers.origin}/account/billing`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('顧客ポータルリンク生成エラー:', error);
    return res.status(500).json({ error: '顧客ポータルリンクの生成に失敗しました' });
  }
} 