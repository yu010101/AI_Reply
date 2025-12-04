import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
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
    
    // リクエストボディからデータを取得
    const { 
      organizationId, 
      email, 
      roleId 
    } = req.body;
    
    if (!organizationId || !email || !roleId) {
      return res.status(400).json({ error: 'パラメータが不足しています' });
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
      return res.status(403).json({ error: 'ユーザーを招待する権限がありません' });
    }
    
    // 既存ユーザーの確認
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    // 既に招待されていないか確認
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();
    
    if (existingInvite) {
      return res.status(400).json({ error: 'このユーザーはすでに招待されています' });
    }
    
    // 招待トークンの生成
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効
    
    // 招待レコードの作成
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert([{
        organization_id: organizationId,
        email,
        token,
        role_id: roleId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by: userId
      }])
      .select()
      .single();
    
    if (inviteError) {
      logger.error('招待作成エラー', { error: inviteError });
      return res.status(500).json({ error: '招待の作成に失敗しました' });
    }
    
    // 招待メールの送信
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`;
    
    // 組織名の取得
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, display_name')
      .eq('id', organizationId)
      .single();
    
    const orgName = organization?.display_name || organization?.name || 'AI Reply';
    
    // メール送信設定
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    await transporter.sendMail({
      from: `"${orgName}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: `${orgName}への招待`,
      text: `${orgName}に招待されました。以下のリンクから招待を受け入れてください：\n\n${inviteUrl}\n\nこのリンクは7日間有効です。`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${orgName}への招待</h2>
          <p>${orgName}に招待されました。</p>
          <p>以下のボタンをクリックして招待を受け入れてください：</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">招待を受け入れる</a>
          </p>
          <p>または、以下のURLをブラウザに貼り付けてください：</p>
          <p>${inviteUrl}</p>
          <p>このリンクは7日間有効です。</p>
        </div>
      `
    });
    
    return res.status(200).json({
      success: true,
      invitation
    });
  } catch (error: any) {
    logger.error('招待エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 