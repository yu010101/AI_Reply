import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import Stripe from 'stripe';
import { logger } from '@/utils/logger';

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
    const { 
      organizationId, 
      subscriptionId, 
      description, 
      items = [], 
      additionalInfo = {},
      sendImmediately = false
    } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: '組織IDが必要です' });
    }
    
    // ユーザーがこの組織の管理者であるか確認
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('role_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();
    
    if (orgError || !orgUser) {
      return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
    }
    
    // 管理者権限を確認（role_id = 1 が管理者と仮定）
    if (orgUser.role_id !== 1) {
      return res.status(403).json({ error: '請求書を作成する権限がありません' });
    }
    
    // 組織情報を取得
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (organizationError || !organization) {
      return res.status(404).json({ error: '組織情報が見つかりません' });
    }
    
    // Stripe顧客IDを取得
    const customerId = organization.stripe_customer_id;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe顧客IDが設定されていません' });
    }
    
    // 請求書アイテムの検証
    if (items.length === 0) {
      return res.status(400).json({ error: '請求項目が必要です' });
    }
    
    // Stripe請求書アイテムを作成
    const invoiceItems = [];
    
    for (const item of items) {
      if (!item.amount || !item.description) {
        return res.status(400).json({ error: '請求項目には金額と説明が必要です' });
      }
      
      const invoiceItem = await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100), // センットに変換
        currency: 'jpy',
        description: item.description
      });
      
      invoiceItems.push(invoiceItem);
    }
    
    // 請求書を作成
    const invoice = await stripe.invoices.create({
      customer: customerId,
      description: description || `AI Reply - ${new Date().toLocaleDateString('ja-JP')}`,
      collection_method: 'send_invoice',
      days_until_due: 30, // 30日後が支払い期限
      custom_fields: additionalInfo.custom_fields || [],
      footer: additionalInfo.footer || '',
      metadata: {
        organization_id: organizationId,
        created_by: userId,
        subscription_id: subscriptionId || '',
        ...additionalInfo.metadata
      }
    });
    
    // すぐに送信する場合
    if (sendImmediately && invoice.id) {
      await stripe.invoices.sendInvoice(invoice.id);
    }
    
    // 請求書情報をデータベースに保存
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        id: invoice.id,
        organization_id: organizationId,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: customerId,
        subscription_id: subscriptionId || null,
        amount: invoice.total,
        status: invoice.status,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        sent_at: sendImmediately ? new Date().toISOString() : null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (invoiceError) {
      logger.error('請求書データベース保存エラー', { error: invoiceError });
      // 保存に失敗しても請求書自体は作成されているので処理を続行
    }
    
    // 監査ログを記録
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'invoice_created',
      resource_type: 'invoice',
      resource_id: invoice.id,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
        amount: invoice.total,
        sent_immediately: sendImmediately
      })
    }]);
    
    return res.status(200).json({
      success: true,
      invoice: {
        id: invoice.id,
        amount: invoice.total,
        status: invoice.status,
        url: invoice.hosted_invoice_url,
        pdf: invoice.invoice_pdf,
        sent: sendImmediately
      }
    });
  } catch (error: any) {
    logger.error('請求書作成エラー', { error });
    
    // Stripeエラーの場合は詳細を返す
    if (error.type && error.type.startsWith('Stripe')) {
      return res.status(400).json({ 
        error: error.message || '請求書の作成中にエラーが発生しました',
        code: error.code || 'unknown_error'
      });
    }
    
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 