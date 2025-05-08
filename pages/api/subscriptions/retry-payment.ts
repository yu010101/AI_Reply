import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';
import { logAuditEvent } from '@/utils/auditLogger';

// Stripeインスタンスの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil'
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }
    
    const userId = session.user.id;
    
    // リクエストボディからデータを取得
    const { paymentIntentId, subscriptionId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment Intent ID が必要です' });
    }
    
    // サブスクリプション情報を取得
    let subscription;
    if (subscriptionId) {
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();
      
      if (subError) {
        console.error('サブスクリプション取得エラー:', subError);
        return res.status(404).json({ error: 'サブスクリプションが見つかりません' });
      }
      
      subscription = sub;
      
      // ユーザーがこの組織に所属しているか確認
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('role_id')
        .eq('organization_id', subscription.organization_id)
        .eq('user_id', userId)
        .single();
      
      if (orgError || !orgUser) {
        return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
      }
      
      // 管理者権限を確認（role_id = 1 が管理者と仮定）
      if (orgUser.role_id !== 1) {
        return res.status(403).json({ error: '支払いを再試行する権限がありません' });
      }
    } else {
      // ユーザー自身のPayment Intentを検索
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_provider_payment_id', paymentIntentId)
        .single();
      
      if (paymentError || !payment) {
        return res.status(404).json({ error: '支払い情報が見つかりません' });
      }
      
      // ユーザーがこの組織に所属しているか確認
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('role_id')
        .eq('organization_id', payment.organization_id)
        .eq('user_id', userId)
        .single();
      
      if (orgError || !orgUser || orgUser.role_id !== 1) {
        return res.status(403).json({ error: '支払いを再試行する権限がありません' });
      }
    }
    
    // Stripeで支払いを再試行
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment Intent が見つかりません' });
    }
    
    if (paymentIntent.status === 'succeeded') {
      return res.status(400).json({ error: 'この支払いは既に成功しています' });
    }
    
    // 支払い方法が関連付けられているか確認
    if (!paymentIntent.payment_method) {
      return res.status(400).json({ 
        error: '有効な支払い方法がありません。新しい支払い方法を追加してください',
        requiresAction: true,
        actionType: 'update_payment_method'
      });
    }
    
    // 支払いを確認（再試行）
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    
    // 状態に応じてレスポンスを返す
    if (confirmedIntent.status === 'succeeded') {
      // 支払い成功
      
      // 支払い情報を更新
      await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          updated_at: new Date().toISOString()
        })
        .eq('payment_provider_payment_id', paymentIntentId);
      
      // 監査ログに記録
      await logAuditEvent({
        userId,
        action: 'payment_succeeded',
        resourceType: 'payment',
        resourceId: paymentIntentId,
        details: {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          subscription_id: subscriptionId
        }
      });
      
      return res.status(200).json({
        success: true,
        status: 'succeeded',
        message: '支払いが成功しました'
      });
    } else if (confirmedIntent.status === 'requires_action') {
      // 3Dセキュア等の追加アクションが必要
      return res.status(200).json({
        success: false,
        status: 'requires_action',
        requiresAction: true,
        actionType: '3d_secure',
        clientSecret: confirmedIntent.client_secret,
        message: '追加の認証が必要です'
      });
    } else if (confirmedIntent.status === 'requires_payment_method') {
      // 支払い方法の更新が必要
      return res.status(200).json({
        success: false,
        status: 'requires_payment_method',
        requiresAction: true,
        actionType: 'update_payment_method',
        message: '支払いが拒否されました。別の支払い方法を試してください'
      });
    } else {
      // その他のステータス
      return res.status(200).json({
        success: false,
        status: confirmedIntent.status,
        message: '支払いを再試行できませんでした'
      });
    }
  } catch (error: any) {
    console.error('支払い再試行エラー:', error);
    
    // Stripeエラーの場合は詳細を返す
    if (error.type && error.type.startsWith('Stripe')) {
      return res.status(400).json({ 
        error: error.message || '支払い処理中にエラーが発生しました',
        code: error.code || 'unknown_error'
      });
    }
    
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 