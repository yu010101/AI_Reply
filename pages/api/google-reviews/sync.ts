import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore - googleapis の型定義問題を回避
import { google } from 'googleapis';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';

// レビューの型定義
interface GoogleReview {
  name?: string;
  rating?: number;
  text?: {
    text?: string;
  };
  createTime?: string;
  authorAttribution?: {
    displayName?: string;
    photoUri?: string;
    uri?: string;
  };
}

// データ型定義
interface ReviewData {
  platform: string;
  platform_review_id: string;
  location_id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  review_date: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// Google API設定
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = authSession.user.id;
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'ロケーションIDが必要です' });
    }

    // ロケーション情報を取得
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .eq('tenant_id', userId)
      .single();

    if (locationError) {
      return res.status(400).json({ error: 'ロケーション情報の取得に失敗しました' });
    }

    if (!location.google_place_id) {
      return res.status(400).json({ error: 'GoogleプレイスIDが設定されていません' });
    }

    // Google Places APIからレビューを取得
    const places = google.places({
      version: 'v1',
      auth: GOOGLE_API_KEY
    });

    const { data: placeDetails } = await places.places.get({
      name: `places/${location.google_place_id}`,
      languageCode: 'ja-JP',
      requestedFields: ['reviews']
    });

    if (!placeDetails.reviews || placeDetails.reviews.length === 0) {
      return res.status(200).json({ message: 'レビューがありません', count: 0 });
    }

    // レビューをデータベースに保存
    const reviews = placeDetails.reviews.map((review: GoogleReview) => ({
      platform: 'google',
      platform_review_id: review.name?.split('/').pop() || '',
      location_id: locationId,
      rating: review.rating || 0,
      comment: review.text?.text || '',
      reviewer_name: review.authorAttribution?.displayName || '匿名ユーザー',
      reviewer_avatar: review.authorAttribution?.photoUri || null,
      review_date: review.createTime || new Date().toISOString(),
      source_url: review.authorAttribution?.uri || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // 既存のレビューを取得して比較
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('platform_review_id')
      .eq('location_id', locationId)
      .eq('platform', 'google');

    const existingReviewIds = new Set(existingReviews?.map(r => r.platform_review_id) || []);
    const newReviews = reviews.filter((r: ReviewData) => !existingReviewIds.has(r.platform_review_id));

    if (newReviews.length === 0) {
      return res.status(200).json({ message: '新しいレビューはありません', count: 0 });
    }

    // 使用量をカウント
    try {
      await recordUsage('review', newReviews.length);
    } catch (err: any) {
      if (err.limitExceeded) {
        return res.status(403).json({ 
          error: 'レビュー取得の上限に達しました',
          limitExceeded: true,
          currentUsage: err.currentUsage,
          limit: err.limit
        });
      }
    }

    // 新しいレビューを保存
    const { data: savedReviews, error: saveError } = await supabase
      .from('reviews')
      .insert(newReviews)
      .select();

    if (saveError) {
      return res.status(400).json({ error: 'レビューの保存に失敗しました' });
    }

    return res.status(200).json({
      message: 'レビューを同期しました',
      count: savedReviews?.length || 0,
      reviews: savedReviews
    });
  } catch (error) {
    console.error('Googleレビュー同期エラー:', error);
    return res.status(500).json({ error: 'Googleレビューの同期に失敗しました' });
  }
} 