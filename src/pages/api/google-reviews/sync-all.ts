import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // 失敗したレビュー同期を再試行するかどうか
    const retryFailed = req.query.retryFailed === 'true';

    // トークン情報を取得
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('tenant_id', session.user.id)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Google認証が必要です' });
    }

    // ユーザーの全店舗を取得
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, google_place_id')
      .eq('tenant_id', session.user.id);

    if (locationsError) {
      return res.status(500).json({ error: '店舗情報の取得に失敗しました' });
    }

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: '店舗が登録されていません' });
    }

    // 各店舗のレビューを同期（ダミーデータ）
    const results = [];
    let totalReviews = 0;

    for (const location of locations) {
      if (!location.google_place_id) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: 'Google Place IDが設定されていません'
        });
        continue;
      }

      // 実際の実装ではGoogle My Business APIを使用してレビューを取得
      // ここではダミーレビューを生成して保存
      const dummyReviews = [
        {
          location_id: location.id,
          tenant_id: session.user.id,
          google_review_id: `review_${location.id}_${Date.now()}_1`,
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
          location_id: location.id,
          tenant_id: session.user.id,
          google_review_id: `review_${location.id}_${Date.now()}_2`,
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
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: '保存エラー'
        });
      } else {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: true,
          reviewsCount: dummyReviews.length
        });
        totalReviews += dummyReviews.length;
      }
    }

    // 同期成功
    res.status(200).json({
      success: true,
      message: `${totalReviews}件のレビューを同期しました`,
      results
    });
  } catch (error) {
    console.error('Google Reviewの一括同期エラー:', error);
    res.status(500).json({ error: 'レビューの同期中にエラーが発生しました' });
  }
} 