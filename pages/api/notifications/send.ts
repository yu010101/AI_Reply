import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reviewId, type = 'new_review' } = req.body;

    if (!reviewId) {
      return res.status(400).json({ error: 'レビューIDが必要です' });
    }

    // レビュー情報を取得
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        locations(
          id,
          name,
          tenant_id
        )
      `)
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'レビューが見つかりません', details: reviewError });
    }

    const location = review.locations;
    const tenantId = location.tenant_id;

    // テナントの通知設定を取得
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError) {
      return res.status(500).json({ error: '通知設定の取得に失敗しました', details: settingsError });
    }

    // 通知設定がない場合は通知しない
    if (!notificationSettings || !notificationSettings.notification_email) {
      return res.status(200).json({ success: true, message: '通知設定がないため、通知は送信されませんでした' });
    }

    const rating = review.rating;

    // 低評価の場合のみ通知するか、すべてのレビューを通知するかを確認
    const shouldNotify = 
      notificationSettings.notify_all_reviews ||
      (notificationSettings.notify_low_ratings && rating <= notificationSettings.low_rating_threshold);

    if (!shouldNotify) {
      return res.status(200).json({ success: true, message: '通知条件に合致しないため、通知は送信されませんでした' });
    }

    // メール送信設定
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // メールテンプレートを作成
    const subject = rating <= 3 
      ? `【緊急】${location.name}に低評価レビューが投稿されました` 
      : `【新着】${location.name}に新しいレビューが投稿されました`;

    const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const emailHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .review { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .rating { font-size: 20px; color: #ffc107; margin-bottom: 10px; }
            .comment { line-height: 1.8; }
            .footer { font-size: 12px; color: #6c757d; border-top: 1px solid #eee; padding-top: 10px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${subject}</h2>
            </div>
            <p>
              ${location.name}に新しいレビューが投稿されました。内容をご確認ください。
            </p>
            <div class="review">
              <div class="rating">${ratingStars} (${rating}/5)</div>
              <p><strong>投稿者:</strong> ${review.reviewer_name || '匿名'}</p>
              <p><strong>投稿日:</strong> ${new Date(review.review_date).toLocaleDateString('ja-JP')}</p>
              <div class="comment">
                <p><strong>コメント:</strong></p>
                <p>${review.comment || '(コメントなし)'}</p>
              </div>
            </div>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews/${reviewId}" class="button">レビューを確認する</a>
            </p>
            <div class="footer">
              <p>このメールはRevAI Conciergeから自動送信されています。</p>
              <p>通知設定の変更は<a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">設定画面</a>から行えます。</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // メール送信
    await transporter.sendMail({
      from: `"RevAI Concierge" <${process.env.SMTP_USER}>`,
      to: notificationSettings.notification_email,
      subject: subject,
      html: emailHtml
    });

    // 通知ログを記録
    await supabase
      .from('notification_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        notification_type: 'email',
        status: 'sent',
        sent_to: notificationSettings.notification_email,
        notification_date: new Date().toISOString()
      });

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('通知送信エラー', { error });
    return res.status(500).json({ error: '通知の送信に失敗しました' });
  }
} 