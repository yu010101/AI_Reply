import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // 招待メールを送信
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: id,
        role: role,
      },
    });

    if (inviteError) {
      throw inviteError;
    }

    // ユーザーロールを登録
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: req.body.user_id,
        tenant_id: id,
        role: role,
      });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 