import { supabase } from './supabase';
import { fetchPlaceReviews } from './googlePlaces';
import { ReviewFormData } from '@/types/review';
import { sendLineNotification, formatReviewNotification } from './line';

export const collectReviews = async (locationId: string, placeId: string, apiKey: string) => {
  try {
    // Google Places APIからレビューを取得
    const placeData = await fetchPlaceReviews(placeId, apiKey);
    if (!placeData) {
      throw new Error('店舗情報が見つかりません');
    }

    // 既存のレビューを取得
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('id, created_at')
      .eq('location_id', locationId);

    // 新しいレビューをフィルタリング
    const newReviews = placeData.reviews.filter(review => {
      const reviewDate = new Date(review.created_at * 1000);
      return !existingReviews?.some(existing => {
        const existingDate = new Date(existing.created_at);
        return existingDate.getTime() === reviewDate.getTime();
      });
    });

    // 新しいレビューを保存
    const reviewData: ReviewFormData[] = newReviews.map(review => ({
      location_id: locationId,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      status: 'pending',
    }));

    if (reviewData.length > 0) {
      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) throw error;

      // LINE通知を送信
      const { data: location } = await supabase
        .from('locations')
        .select('name, line_user_id')
        .eq('id', locationId)
        .single();

      if (location?.line_user_id) {
        await sendLineNotification(
          location.line_user_id,
          formatReviewNotification(location.name, reviewData.length)
        );
      }
    }

    return {
      success: true,
      newReviewsCount: reviewData.length,
    };
  } catch (error) {
    console.error('レビュー収集エラー:', error);
    throw new Error('レビューの収集に失敗しました');
  }
}; 