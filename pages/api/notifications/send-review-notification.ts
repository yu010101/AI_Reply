import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

// メール送信の設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // このエンドポイントはWebhookとして使用されるため、POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // シークレットキーの検証
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.NOTIFICATION_API_KEY) {
    return res.status(401).json({ error: '認証に失敗しました' });
  }

  try {
    const { reviewId, notificationType } = req.body;

    if (!reviewId || !notificationType) {
      return res.status(400).json({ error: '必須パラメータが不足しています' });
    }

    // レビュー情報の取得
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        locations (
          id,
          name,
          tenant_id
        )
      `)
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return res.status(400).json({ error: 'レビュー情報の取得に失敗しました' });
    }

    const tenantId = review.locations.tenant_id;

    // テナント情報の取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    // 通知設定の取得
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError) {
      return res.status(400).json({ error: '通知設定の取得に失敗しました' });
    }

    // 通知条件のチェック
    const isNewReview = notificationType === 'new_review';
    const isLowRating = notificationType === 'low_rating';
    
    if (isNewReview && !settings.new_review_notification) {
      return res.status(200).json({ message: '新規レビュー通知は無効です' });
    }
    
    if (isLowRating && !settings.low_rating_notification) {
      return res.status(200).json({ message: '低評価レビュー通知は無効です' });
    }
    
    if (isLowRating && review.rating > settings.low_rating_threshold) {
      return res.status(200).json({ message: '低評価の閾値を超えています' });
    }

    // メール通知が無効な場合
    if (!settings.email_notifications) {
      return res.status(200).json({ message: 'メール通知は無効です' });
    }

    const businessName = tenant.name || 'RevAI Concierge';
    const locationName = review.locations.name;
    const reviewerName = review.reviewer_name || '匿名ユーザー';
    const rating = review.rating;
    const reviewDate = new Date(review.review_date).toLocaleDateString('ja-JP');
    const comment = review.comment || '(コメントなし)';
    const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    // メール件名
    const subject = isLowRating 
      ? `【重要】${locationName}に低評価のレビューが投稿されました` 
      : `【${businessName}】${locationName}に新しいレビューが投稿されました`;

    // HTMLメール本文
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${isLowRating ? '低評価レビュー通知' : '新規レビュー通知'}</h2>
        <p>こんにちは！</p>
        <p>${locationName}に${isLowRating ? '低評価の' : '新しい'}レビューが投稿されました。</p>
        
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>店舗名:</strong> ${locationName}</p>
          <p><strong>投稿者:</strong> ${reviewerName}</p>
          <p><strong>評価:</strong> ${ratingStars} (${rating}/5)</p>
          <p><strong>投稿日:</strong> ${reviewDate}</p>
          <p><strong>コメント:</strong></p>
          <p style="background-color: white; padding: 10px; border-radius: 3px;">${comment}</p>
        </div>
        
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews" style="display: inline-block; background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            レビューに返信する
          </a>
        </p>
        
        <hr style="margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          このメールはシステムからの自動送信です。返信はできません。<br>
          通知設定の変更は <a href="${process.env.NEXT_PUBLIC_APP_URL}/notifications">通知設定ページ</a> から行えます。
        </p>
      </div>
    `;

    // メール送信
    await transporter.sendMail({
      from: `"${businessName}" <${process.env.SMTP_USER}>`,
      to: settings.notification_email,
      subject,
      html,
    });

    // 通知ログの保存
    await supabase
      .from('notification_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        notification_type: notificationType,
        email: settings.notification_email,
        sent_at: new Date().toISOString(),
      });

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('通知送信エラー', { error });
    return res.status(500).json({ error: '通知の送信に失敗しました' });
  }
} 