import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';
// @ts-ignore
import { google } from 'googleapis';

// API制限用の設定
const API_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_DAY: 5000,
  COOLDOWN_TIME: 60 * 1000, // 1分のクールダウン時間（ミリ秒）
};

// レート制限のための状態管理
class RateLimiter {
  private requestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastResetTime: number = Date.now();
  private dailyResetTime: number = new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000; // 翌日の0時
  private isLimited: boolean = false;

  constructor() {
    // 日次リセットタイマーを設定
    setInterval(() => {
      const now = Date.now();
      if (now >= this.dailyResetTime) {
        this.dailyRequestCount = 0;
        this.dailyResetTime = new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000;
      }
    }, 60 * 1000); // 1分ごとにチェック
  }

  async recordRequest(): Promise<boolean> {
    const now = Date.now();
    
    // 1分ごとにリセット
    if (now - this.lastResetTime >= 60 * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      this.isLimited = false;
    }

    // リミットチェック
    if (this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE || 
        this.dailyRequestCount >= API_LIMITS.MAX_REQUESTS_PER_DAY) {
      this.isLimited = true;
      
      // リミット超過をログに記録
      await supabase
        .from('api_limit_logs')
        .insert({
          api_name: 'Google Business Profile API',
          limit_type: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? 'minute' : 'daily',
          request_count: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? this.requestCount : this.dailyRequestCount,
          limit_value: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? API_LIMITS.MAX_REQUESTS_PER_MINUTE : API_LIMITS.MAX_REQUESTS_PER_DAY,
          timestamp: new Date().toISOString()
        });
      
      return false;
    }

    // リクエストカウントを増加
    this.requestCount++;
    this.dailyRequestCount++;
    return true;
  }

  isRateLimited(): boolean {
    return this.isLimited;
  }

  async waitForCooldown(): Promise<void> {
    if (this.isLimited) {
      return new Promise(resolve => setTimeout(resolve, API_LIMITS.COOLDOWN_TIME));
    }
  }
}

// シングルトンインスタンス
const rateLimiter = new RateLimiter();

// OAuth2クライアントの作成
export const createOAuth2Client = (): OAuth2Client => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
  );
};

// トークンを取得
export const getAuthToken = async (tenantId: string): Promise<{ token: string; isValid: boolean }> => {
  try {
    // トークン情報をデータベースから取得
    const { data, error } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return { token: '', isValid: false };
    }

    // トークンの有効期限をチェック
    const expiryDate = new Date(data.expiry_date);
    const now = new Date();
    
    if (now >= expiryDate) {
      // リフレッシュトークンを使用して新しいトークンを取得
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: data.refresh_token
      });

      const tokenResponse = await oauth2Client.getAccessToken();
      const accessToken = tokenResponse.token || '';
      
      // 新しいトークンと有効期限を保存
      if (accessToken) {
        const { credentials } = oauth2Client;
        // 有効期限がなければ現在時刻から1時間後を設定
        const expiryMillis = credentials.expiry_date || Date.now() + 3600000;
        // 必ず数値型のミリ秒タイムスタンプからDateオブジェクトを経由してISOフォーマットの文字列に変換する
        const expiryDate = new Date(Number(expiryMillis)).toISOString();
        
        await supabase
          .from('google_auth_tokens')
          .update({
            access_token: accessToken,
            expiry_date: expiryDate
          })
          .eq('id', data.id);

        return { token: accessToken, isValid: true };
      }
      
      return { token: '', isValid: false };
    }
    
    return { token: data.access_token, isValid: true };
  } catch (error) {
    console.error('トークン取得エラー:', error);
    return { token: '', isValid: false };
  }
};

// Business Profile API初期化
export const initializeBusinessProfileApi = async (tenantId: string) => {
  const { token, isValid } = await getAuthToken(tenantId);
  
  if (!isValid) {
    throw new Error('Google認証が必要です');
  }
  
  const auth = createOAuth2Client();
  auth.setCredentials({ access_token: token });
  
  return google.mybusinessqanda({ version: 'v1', auth });
};

// アカウント一覧を取得
export const getAccounts = async (tenantId: string): Promise<any[]> => {
  if (!await rateLimiter.recordRequest()) {
    await rateLimiter.waitForCooldown();
    return getAccounts(tenantId); // リミットが解除されたら再試行
  }
  
  try {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessAccountsService = google.mybusinessaccountmanagement({ version: 'v1', auth });
    
    const response = await businessAccountsService.accounts.list();
    return response.data.accounts || [];
  } catch (error) {
    console.error('アカウント一覧取得エラー:', error);
    throw error;
  }
};

// 場所一覧を取得
export const getLocations = async (tenantId: string, accountId: string): Promise<any[]> => {
  if (!await rateLimiter.recordRequest()) {
    await rateLimiter.waitForCooldown();
    return getLocations(tenantId, accountId); // リミットが解除されたら再試行
  }
  
  try {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessLocationsService = google.mybusinessbusinessinformation({ version: 'v1', auth });
    
    const response = await businessLocationsService.accounts.locations.list({
      parent: `accounts/${accountId}`
    });
    
    return response.data.locations || [];
  } catch (error) {
    console.error('場所一覧取得エラー:', error);
    throw error;
  }
};

// レビュー一覧を取得
export const getReviews = async (tenantId: string, locationId: string, pageSize: number = 20, pageToken?: string): Promise<any> => {
  if (!await rateLimiter.recordRequest()) {
    await rateLimiter.waitForCooldown();
    return getReviews(tenantId, locationId, pageSize, pageToken); // リミットが解除されたら再試行
  }
  
  try {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessReviewsService = google.mybusinessplaceactions({ version: 'v1', auth });
    
    const response = await businessReviewsService.locations.reviews.list({
      parent: locationId,
      pageSize,
      pageToken
    });
    
    return response.data;
  } catch (error) {
    console.error('レビュー一覧取得エラー:', error);
    throw error;
  }
};

// レビューに返信
export const replyToReview = async (tenantId: string, reviewId: string, replyText: string): Promise<any> => {
  if (!await rateLimiter.recordRequest()) {
    await rateLimiter.waitForCooldown();
    return replyToReview(tenantId, reviewId, replyText); // リミットが解除されたら再試行
  }
  
  try {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessReviewsService = google.mybusinessplaceactions({ version: 'v1', auth });
    
    const response = await businessReviewsService.locations.reviews.updateReply({
      name: reviewId,
      requestBody: {
        comment: replyText
      }
    });
    
    // 返信ログを記録
    await supabase
      .from('reply_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        reply_content: replyText,
        is_successful: true,
        reply_date: new Date().toISOString()
      });
    
    return response.data;
  } catch (error) {
    console.error('レビュー返信エラー:', error);
    
    // エラーログを記録
    await supabase
      .from('reply_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        reply_content: replyText,
        is_successful: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        reply_date: new Date().toISOString()
      });
    
    throw error;
  }
}; 