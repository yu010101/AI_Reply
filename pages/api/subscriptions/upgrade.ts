import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { createCheckoutSession } from '@/services/stripe/StripeService';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }
    
    const userId = session.user.id;
    
    // リクエストボディから必要な情報を取得
    const { organizationId, planId, billingCycle } = req.body;
    
    if (!organizationId || !planId || !billingCycle) {
      return res.status(400).json({ error: 'パラメータが不足しています' });
    }
    
    // ユーザーが組織に所属しているか確認
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('role_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();
    
    if (orgError || !orgUser) {
      return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
    }
    
    // リダイレクトURLの構築
    const host = req.headers.host || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    const successUrl = `${protocol}://${host}/settings?tab=2&success=true`;
    const cancelUrl = `${protocol}://${host}/settings?tab=2&cancelled=true`;
    
    // Stripe決済セッションを作成
    const checkoutUrl = await createCheckoutSession(
      organizationId,
      planId,
      billingCycle,
      successUrl,
      cancelUrl
    );
    
    if (!checkoutUrl) {
      return res.status(500).json({ error: '決済セッションの作成に失敗しました' });
    }
    
    // 決済ページのURLを返す
    return res.status(200).json({ url: checkoutUrl });
  } catch (error: any) {
    logger.error('プランアップグレードエラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 