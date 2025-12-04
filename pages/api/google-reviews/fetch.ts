import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@googlemaps/google-maps-services-js';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

// Google Places APIクライアントの初期化
const googleMapsClient = new Client({});

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

    const { placeId, locationId } = req.body;

    if (!placeId || !locationId) {
      return res.status(400).json({ error: '店舗IDが必要です' });
    }

    // Google Places APIからレビューを取得
    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_API_KEY as string,
          // @ts-ignore - 'ja'は実際には有効な言語設定ですが、型定義が制限的です
          language: 'ja',
          fields: ['name', 'rating', 'reviews']
        }
      });

      const place = response.data.result;
      const reviews = place.reviews || [];

      // レビューをデータベースに保存
      let savedCount = 0;
      const errors = [];

      for (const review of reviews) {
        try {
          // review.timeを数値型に確実に変換
          const reviewTime = typeof review.time === 'string' ? parseInt(review.time, 10) : review.time;
          const reviewDate = new Date(reviewTime * 1000);
          
          // レビューが既に存在するか確認
          const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('location_id', locationId)
            .eq('google_review_id', review.time.toString())
            .single();

          if (!existingReview) {
            // 新しいレビューを追加
            const { data, error } = await supabase
              .from('reviews')
              .insert({
                location_id: locationId,
                reviewer_name: review.author_name,
                rating: review.rating,
                comment: review.text,
                review_date: reviewDate.toISOString(),
                google_review_id: review.time.toString(),
                status: 'new'
              })
              .select('id')
              .single();

            if (error) {
              errors.push(error);
            } else {
              savedCount++;
              
              // 新しいレビューの通知を送信
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reviewId: data.id, type: 'new_review' }),
              });
            }
          }
        } catch (err) {
          console.error('レビュー保存エラー:', err);
          errors.push(err);
        }
      }

      // 店舗情報を更新
      await supabase
        .from('locations')
        .update({
          google_rating: place.rating,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', locationId);

      return res.status(200).json({ 
        success: true, 
        total: reviews.length,
        saved: savedCount,
        errors: errors.length > 0 ? errors : null
      });
    } catch (error: any) {
      logger.error('Google Places API error', { error });
      return res.status(500).json({ 
        error: 'Google Places APIからのデータ取得に失敗しました',
        details: error.message 
      });
    }
  } catch (error) {
    logger.error('Server error', { error });
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
} 