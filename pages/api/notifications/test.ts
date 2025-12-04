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
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = session.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'メールアドレスが必要です' });
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

    // テスト用のHTML
    const emailHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .content { background-color: #ffffff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .footer { font-size: 12px; color: #6c757d; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>RevAI Concierge テスト通知</h2>
            </div>
            <div class="content">
              <p>こんにちは。これはRevAI Conciergeからのテスト通知です。</p>
              <p>このメールは通知設定のテストとして送信されています。</p>
              <p>このメールが正しく届いていれば、通知設定は正常に機能しています。</p>
            </div>
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
      to: email,
      subject: 'RevAI Concierge テスト通知',
      html: emailHtml
    });

    // 通知ログを記録
    await supabase
      .from('notification_logs')
      .insert({
        tenant_id: userId,
        review_id: null,
        notification_type: 'test',
        status: 'sent',
        sent_to: email,
        notification_date: new Date().toISOString()
      });

    return res.status(200).json({ success: true, message: 'テスト通知を送信しました' });
  } catch (error) {
    logger.error('テスト通知送信エラー', { error });
    return res.status(500).json({ error: 'テスト通知の送信に失敗しました' });
  }
} 