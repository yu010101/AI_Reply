import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // リクエストボディからlocation_idを取得
    const { location_id } = req.body;
    if (!location_id) {
      return res.status(400).json({ error: '店舗IDが必要です' });
    }

    // 店舗情報を取得
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', location_id)
      .eq('tenant_id', session.user.id)
      .single();

    if (locationError || !location) {
      return res.status(404).json({ error: '店舗が見つかりません' });
    }

    // トークン情報を取得
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('tenant_id', session.user.id)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Google認証が必要です' });
    }

    // 実際の実装ではGoogle My Business APIを使用してレビューを取得
    // ここではダミーレビューを生成して保存
    const dummyReviews = [
      {
        location_id,
        tenant_id: session.user.id,
        google_review_id: `review_${Date.now()}_1`,
        author: 'テストユーザー1',
        rating: 4,
        comment: 'とても良いサービスでした。また利用したいです。',
        status: 'pending',
        source: 'google',
        review_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        location_id,
        tenant_id: session.user.id,
        google_review_id: `review_${Date.now()}_2`,
        author: 'テストユーザー2',
        rating: 5,
        comment: '素晴らしい対応でした。スタッフの方々がとても親切でした。',
        status: 'pending',
        source: 'google',
        review_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // レビューをデータベースに保存
    const { data: insertedReviews, error: insertError } = await supabase
      .from('reviews')
      .upsert(dummyReviews, { onConflict: 'google_review_id' })
      .select();

    if (insertError) {
      return res.status(500).json({ error: 'レビューの保存に失敗しました' });
    }

    // 同期成功
    res.status(200).json({
      success: true,
      message: `${dummyReviews.length}件のレビューを同期しました`,
      reviews: insertedReviews
    });
  } catch (error) {
    console.error('Google Reviewの同期エラー:', error);
    res.status(500).json({ error: 'レビューの同期中にエラーが発生しました' });
  }
} 