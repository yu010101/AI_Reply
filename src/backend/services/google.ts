// @ts-ignore
import google from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { db } from '../db';
import { UsageService } from './usage';

export class GoogleService {
  static async fetchReviews(tenantId: string, locationId: string) {
    try {
      // 使用量制限をチェック
      const canFetch = await UsageService.checkUsageLimit(tenantId, 'review');
      if (!canFetch) {
        throw new Error('月間のレビュー取得上限に達しました');
      }

      // Google APIクライアントの初期化
      const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      });

      const client = await auth.getClient();
      // @ts-ignore
      google.options({ auth: client });

      // レビューの取得
      // @ts-ignore
      const mybusiness = google.mybusiness('v4');
      const response = await mybusiness.accounts.locations.reviews.list({
        name: `accounts/${process.env.GOOGLE_ACCOUNT_ID}/locations/${locationId}`,
      });

      // 使用量を記録
      await UsageService.trackUsage(tenantId, 'review');

      // レビューの保存
      for (const review of response.data.reviews || []) {
        await db.query(
          `INSERT INTO reviews (tenant_id, location_id, author, rating, comment, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           ON CONFLICT (tenant_id, location_id, author, created_at)
           DO UPDATE SET rating = $4, comment = $5, updated_at = CURRENT_TIMESTAMP`,
          [
            tenantId,
            locationId,
            review.reviewer?.profilePhotoUrl || 'Anonymous',
            review.rating,
            review.comment,
          ]
        );
      }

      return response.data.reviews;
    } catch (error) {
      console.error('Googleレビューの取得に失敗しました:', error);
      throw error;
    }
  }

  static async replyToReview(tenantId: string, reviewId: string, reply: string) {
    try {
      // 使用量制限をチェック
      const canReply = await UsageService.checkUsageLimit(tenantId, 'ai_reply');
      if (!canReply) {
        throw new Error('月間のAI返信上限に達しました');
      }

      // Google APIクライアントの初期化
      const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      });

      const client = await auth.getClient();
      // @ts-ignore
      google.options({ auth: client });

      // 返信の投稿
      // @ts-ignore
      const mybusiness = google.mybusiness('v4');
      const response = await mybusiness.accounts.locations.reviews.reply({
        name: reviewId,
        requestBody: {
          comment: reply,
        },
      });

      // 使用量を記録
      await UsageService.trackUsage(tenantId, 'ai_reply');

      return response.data;
    } catch (error) {
      console.error('Googleレビューへの返信に失敗しました:', error);
      throw error;
    }
  }
} 