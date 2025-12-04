import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { replyToReview } from '@/utils/googleBusinessProfile';
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
    const { reviewId, replyText, locationId, googleReviewId } = req.body;

    if (!reviewId || !replyText) {
      return res.status(400).json({ error: 'レビューIDと返信テキストが必要です' });
    }

    // レビュー情報を取得して権限を確認
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        locations(tenant_id)
      `)
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'レビューが見つかりません' });
    }

    // テナントの権限確認
    const location = review.locations as { tenant_id: string };
    
    if (location.tenant_id !== userId) {
      return res.status(403).json({ error: 'このレビューに返信する権限がありません' });
    }

    // Google Business Profileトークンの確認
    const { data: tokenData } = await supabase
      .from('google_auth_tokens')
      .select('access_token')
      .eq('tenant_id', userId)
      .single();

    if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({ error: 'Google Business Profileとの連携が必要です' });
    }

    try {
      // レビューに返信
      const fullGoogleReviewId = googleReviewId || review.google_review_id;
      
      if (!fullGoogleReviewId) {
        return res.status(400).json({ error: 'GoogleレビューIDが不明です' });
      }
      
      // Google Business ProfileのAPIを使用して返信
      await replyToReview(userId, fullGoogleReviewId, replyText);

      // データベースに返信を保存
      const { data: replyData, error: replyError } = await supabase
        .from('replies')
        .insert({
          review_id: reviewId,
          content: replyText,
          is_ai_generated: req.body.isAiGenerated || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (replyError) {
        logger.error('返信保存エラー', { error: replyError });
        return res.status(500).json({ error: '返信の保存に失敗しました' });
      }

      // レビューのステータスを更新
      await supabase
        .from('reviews')
        .update({
          status: 'replied',
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      return res.status(200).json({
        success: true,
        replyId: replyData?.id
      });
    } catch (error: any) {
      logger.error('Google返信エラー', { error });
      
      // Googleへの投稿は失敗したが、システム内には保存したい場合
      if (req.body.saveOnFailure) {
        const { data: replyData } = await supabase
          .from('replies')
          .insert({
            review_id: reviewId,
            content: replyText,
            is_ai_generated: req.body.isAiGenerated || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_posted_to_google: false,
            post_error: error.message
          })
          .select('id')
          .single();
          
        return res.status(207).json({ 
          partial_success: true, 
          replyId: replyData?.id,
          error: error.message || 'Googleへの投稿に失敗しました'
        });
      }
      
      return res.status(500).json({ error: error.message || 'Googleへの返信に失敗しました' });
    }
  } catch (error: any) {
    logger.error('返信エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 