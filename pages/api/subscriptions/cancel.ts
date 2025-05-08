import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { cancelStripeSubscription } from '@/services/stripe/StripeService';

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
    const { subscriptionId, organizationId, cancelAtPeriodEnd = true } = req.body;
    
    if (!subscriptionId || !organizationId) {
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
    
    // サブスクリプションがこの組織のものであるか確認
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('organization_id', organizationId)
      .single();
    
    if (subError || !subscription) {
      return res.status(404).json({ error: 'サブスクリプションが見つかりません' });
    }
    
    // Stripeでサブスクリプションをキャンセル
    if (subscription.payment_provider === 'stripe' && subscription.payment_provider_subscription_id) {
      const success = await cancelStripeSubscription(
        subscriptionId,
        cancelAtPeriodEnd
      );
      
      if (!success) {
        return res.status(500).json({ error: 'Stripeでのキャンセルに失敗しました' });
      }
    }
    
    // 自社データベースのサブスクリプションをキャンセル
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(
        cancelAtPeriodEnd
          ? {
              cancel_at_period_end: true,
              updated_at: new Date().toISOString()
            }
          : {
              status: 'canceled',
              updated_at: new Date().toISOString()
            }
      )
      .eq('id', subscriptionId);
    
    if (updateError) {
      return res.status(500).json({ error: 'サブスクリプションの更新に失敗しました' });
    }
    
    return res.status(200).json({
      success: true,
      message: cancelAtPeriodEnd
        ? '現在の期間終了時にサブスクリプションはキャンセルされます。'
        : 'サブスクリプションは即時キャンセルされました。'
    });
  } catch (error: any) {
    console.error('サブスクリプションキャンセルエラー:', error);
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 