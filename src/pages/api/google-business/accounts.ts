import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
// @ts-ignore
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PostgrestError } from '@supabase/supabase-js';

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// レート制限の設定
const rateLimiter = {
  requests: new Map<string, { count: number; timestamp: number }>(),
  windowMs: 60000, // 1分
  maxRequests: 3, // 1分あたりの最大リクエスト数を3に制限（元は10）
  retryAfter: 300, // リトライまでの待機時間を5分に延長（元は60秒）

  isLimited(clientId: string): boolean {
    const now = Date.now();
    const request = this.requests.get(clientId);

    if (!request) {
      this.requests.set(clientId, { count: 1, timestamp: now });
      return false;
    }

    // 1分以上経過している場合はリセット
    if (now - request.timestamp > this.windowMs) {
      this.requests.set(clientId, { count: 1, timestamp: now });
      return false;
    }

    // リクエスト数が制限を超えている場合
    if (request.count >= this.maxRequests) {
      console.log(`[RateLimiter] クライアント ${clientId} のリクエスト制限に達しました: ${request.count}/${this.maxRequests}`);
      return true;
    }

    request.count++;
    return false;
  },

  getRetryAfter(): number {
    return this.retryAfter;
  }
};

// キャッシュの有効期限（24時間 - 元は6時間）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Google Business Profile API のアカウント情報の型 (Google APIのレスポンスに基づく)
interface GoogleApiAccount {
  name?: string | null;
  displayName?: string | null;
  accountName?: string | null;
  type?: string | null;
  locationCount?: number | null;
  primaryOwner?: string | null;
  role?: string | null;
}

// Supabaseのgoogle_business_accountsテーブルの行の型
interface CachedAccountTableRow {
  id?: string;
  tenant_id: string;
  account_id: string;
  display_name: string | null;
  account_name: string | null;
  type: string | null;
  location_count: number | null;
  primary_owner: string | null;
  role: string | null;
  created_at?: string;
  updated_at?: string;
}

// src/pages/api/google-business/accounts.ts
// ... (他のimportや定義はそのまま)

// キャッシュの状態を確認する関数 (Linterエラー対応改善)
async function checkCacheStatus(userId: string): Promise<{ exists: boolean; valid: boolean; count: number; age: string }> {
  try {
    // 1. キャッシュされたアカウントの最新のupdated_atを取得
    const { data: latestCacheEntry, error: latestCacheError } = await supabase
      .from('google_business_accounts')
      .select('updated_at')
      .eq('tenant_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single() as any;

    if (latestCacheError) {
      console.error('[GoogleBusinessAPI] 最新キャッシュエントリ取得エラー(checkCacheStatus):', latestCacheError.message);
      return { exists: false, valid: false, count: 0, age: 'なし' };
    }

    if (!latestCacheEntry) {
      return { exists: false, valid: false, count: 0, age: 'なし' };
    }

    // 2. キャッシュされたアカウントの総数を取得
    const { data, error: countError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);

    if (countError) {
        console.error('[GoogleBusinessAPI] キャッシュ件数取得エラー(checkCacheStatus):', countError.message);
    }
    
    const currentAccountCount = data?.length ?? 0;

    const updatedAtString = latestCacheEntry.updated_at;
    if (typeof updatedAtString !== 'string') {
        console.error('[GoogleBusinessAPI] updated_at が不正な形式です(checkCacheStatus):', updatedAtString);
        return { exists: false, valid: false, count: currentAccountCount, age: 'なし'};
    }
    const lastUpdate = new Date(updatedAtString);
    const now = new Date();
    const ageMs = now.getTime() - lastUpdate.getTime();
    const isValid = ageMs < CACHE_EXPIRY;

    console.log('[GoogleBusinessAPI] キャッシュ状態:', {
        exists: true,
        valid: isValid,
        count: currentAccountCount,
        age: `${Math.floor(ageMs / 1000)}秒前`,
        lastUpdate: lastUpdate.toISOString()
    });

    return {
        exists: true,
        valid: isValid,
        count: currentAccountCount,
        age: `${Math.floor(ageMs / 1000)}秒前`
    };
  } catch (err) { 
    const genericError = err as Error;
    console.error('[GoogleBusinessAPI] キャッシュ確認エラー(catch block in checkCacheStatus):', genericError.message);
    return { exists: false, valid: false, count: 0, age: 'なし' };
  }
}

// Google Business Profile APIの設定
const businessProfileApi = google.businessprofileperformance('v1');

// アカウント情報の型定義 (フロントエンドと共通化できるとよい)
interface GoogleBusinessAccount {
  name: string;
  displayName: string;
  accountName: string;
  type: string;
  locationCount: number;
  primaryOwner: string;
  role: string;
}

// アカウント情報を取得する関数 (Linterエラー対応改善)
async function getAccounts(userId: string): Promise<GoogleApiAccount[]> {
  try {
    console.log('[GoogleBusinessAPI] トークン情報を取得開始:', { userId });
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('access_token, refresh_token, expiry_date')
      .eq('tenant_id', userId)
      .single();

    if (tokenError) {
      console.error('[GoogleBusinessAPI] トークン取得エラー(getAccounts):', tokenError.message);
      throw new Error(`トークンの取得に失敗しました: ${tokenError.message}`);
    }

    if (!tokenData) {
      console.error('[GoogleBusinessAPI] トークンデータが見つかりません(getAccounts):', { userId });
      throw new Error('トークンデータが見つかりません');
    }

    console.log('[GoogleBusinessAPI] トークン取得成功(getAccounts):', { 
        hasAccessToken: Boolean(tokenData.access_token),
        hasRefreshToken: Boolean(tokenData.refresh_token),
        expiryDate: tokenData.expiry_date
     });
    const expiryDate = new Date(tokenData.expiry_date);
    const now = new Date();
    if (now >= expiryDate) {
      console.error('[GoogleBusinessAPI] トークンの有効期限切れ(getAccounts)');
      throw new Error('トークンの有効期限が切れています');
    }

    const oauth2Client = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
    });

    const businessProfile: google.businessprofileperformance.Businessprofileperformance = google.businessprofileperformance({
      version: 'v1',
      auth: oauth2Client
    });

    try {
      const response = await businessProfile.accounts.list();
      if (!response.data.accounts) {
        return [];
      }
      return response.data.accounts.map((account: GoogleApiAccount) => ({ 
        name: account.name || '',
        displayName: account.displayName || '',
        accountName: account.accountName || '',
        type: account.type || '',
        locationCount: account.locationCount || 0,
        primaryOwner: account.primaryOwner || '',
        role: account.role || ''
       })) as GoogleApiAccount[];
    } catch (apiErr: any) {
      console.error('[GoogleBusinessAPI] Google API呼び出しエラー(getAccounts):', apiErr.message, 'Code:', apiErr.code);
      throw apiErr;
    }
  } catch (err: any) {
    console.error('[GoogleBusinessAPI] アカウント情報取得中の予期せぬエラー(getAccounts):', err.message);
    throw err;
  }
}

// アカウント情報をキャッシュに保存する関数 (Linterエラー対応改善)
async function saveAccountsToCache(userId: string, accounts: GoogleApiAccount[]): Promise<void> {
  try {
    console.log('[GoogleBusinessAPI] キャッシュを更新します(saveAccountsToCache)');
    
    const { error: deleteError } = await supabase
      .from('google_business_accounts')
      .delete()
      .eq('tenant_id', userId);
    
    if (deleteError) {
      console.error('[GoogleBusinessAPI] キャッシュ削除エラー(saveAccountsToCache):', deleteError.message);
      throw new Error(`キャッシュの削除に失敗しました: ${deleteError.message}`);
    }
    
    if (accounts.length === 0) {
        console.log('[GoogleBusinessAPI] 保存するアカウント情報がありません。キャッシュの更新をスキップします。');
        return;
    }

    const recordsToInsert: Array<Omit<CachedAccountTableRow, 'id' | 'created_at' | 'updated_at'>> = accounts.map(acc => ({
      tenant_id: userId,
      account_id: acc.name?.split('/').pop() || '',
      display_name: acc.displayName,
      account_name: acc.accountName,
      type: acc.type,
      location_count: acc.locationCount,
      primary_owner: acc.primaryOwner,
      role: acc.role,
    }));

    const { error: insertError } = await supabase
      .from('google_business_accounts')
      .insert(recordsToInsert);
      
    if (insertError) {
      console.error('[GoogleBusinessAPI] キャッシュ保存エラー(saveAccountsToCache):', insertError.message);
      throw new Error(`キャッシュの保存に失敗しました: ${insertError.message}`);
    }

    console.log('[GoogleBusinessAPI] キャッシュを更新しました(saveAccountsToCache):', recordsToInsert.length + '件');
  } catch (err) {
    const genericError = err as Error;
    console.error('[GoogleBusinessAPI] キャッシュ更新エラー(catch block in saveAccountsToCache):', genericError.message);
    throw genericError;
  }
}

// 頻繁なAPI呼び出しを防ぐためのデバウンス機能
let lastApiCallTime: { [key: string]: number } = {};
const API_CALL_COOLDOWN = 5 * 60 * 1000; // 5分間は同じユーザーからのAPI呼び出しをブロック

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let userId: string;
    if (isDevelopment) {
      userId = req.query.userId as string;
      if (!userId) {
        console.error('[GoogleBusinessAPI] 開発環境: ユーザーIDが指定されていません(handler)');
        return res.status(400).json({ error: '開発環境ではユーザーIDが必要です' });
      }
    } else {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[GoogleBusinessAPI] セッション取得エラー(handler):', sessionError.message);
        return res.status(401).json({ error: '認証が必要です' });
      }
      if (!session) {
        console.error('[GoogleBusinessAPI] セッションが見つかりません(handler)');
        return res.status(401).json({ error: '認証が必要です' });
      }
      userId = session.user.id;
    }

    console.log(`[GoogleBusinessAPI] リクエスト受信: userId=${userId} (handler)`);
    
    // API呼び出しデバウンス処理を追加
    const now = Date.now();
    const lastCall = lastApiCallTime[userId] || 0;
    if (now - lastCall < API_CALL_COOLDOWN) {
      console.log(`[GoogleBusinessAPI] 短時間での連続呼び出しを検出しました。前回：${new Date(lastCall).toISOString()}`);
      // 前回のAPI呼び出しから十分な時間が経過していない場合は必ずキャッシュを返す
      const { data: cachedAccounts, error: cacheError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);

      if (!cacheError && cachedAccounts && cachedAccounts.length > 0) {
        console.log(`[GoogleBusinessAPI] 連続呼び出し制限により強制的にキャッシュ利用: ${cachedAccounts.length}件`);
        return res.status(200).json({
          accounts: cachedAccounts.map((account) => ({ 
            name: `accounts/${account.account_id}`,
            displayName: account.display_name || '',
            accountName: account.account_name || '',
            type: account.type || '',
            locationCount: account.location_count || 0,
            primaryOwner: account.primary_owner || '',
            role: account.role || '',
            cached: true,
            lastUpdated: account.updated_at
           })),
          source: 'forced-cache',
          nextRefreshAvailable: new Date(lastCall + API_CALL_COOLDOWN).toISOString(),
          cooldownSeconds: Math.ceil((API_CALL_COOLDOWN - (now - lastCall)) / 1000)
        });
      }
      // キャッシュが空でもレート制限は適用
      const remainingTime = Math.ceil((API_CALL_COOLDOWN - (now - lastCall)) / 1000);
      return res.status(429).json({ 
        error: '短時間での連続呼び出しは制限されています', 
        retryAfter: remainingTime,
        nextRefreshAvailable: new Date(lastCall + API_CALL_COOLDOWN).toISOString()
      });
    }

    const cacheStatus = await checkCacheStatus(userId);
    
    if (cacheStatus.exists && cacheStatus.valid) {
      console.log('[GoogleBusinessAPI] 有効なキャッシュを使用します(handler)');
      const { data: cachedAccounts, error: cacheError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);

      if (cacheError) {
        console.error('[GoogleBusinessAPI] キャッシュ取得エラー(handler - valid cache):', cacheError.message);
      } else if (cachedAccounts && cachedAccounts.length > 0) {
        console.log(`[GoogleBusinessAPI] キャッシュから ${cachedAccounts.length} 件のアカウント情報を返却します (handler)`);
        return res.status(200).json({
          accounts: cachedAccounts.map((account) => ({ 
            name: `accounts/${account.account_id}`,
            displayName: account.display_name || '',
            accountName: account.account_name || '',
            type: account.type || '',
            locationCount: account.location_count || 0,
            primaryOwner: account.primary_owner || '',
            role: account.role || '',
            cached: true,
            lastUpdated: account.updated_at
           })),
          source: 'cache'
        });
      }
    }

    if (rateLimiter.isLimited(userId)) {
      const retryAfter = rateLimiter.getRetryAfter();
      console.log(`[RateLimiter] レート制限により実行をスキップします (handler)`);
      return res.status(429).json({
        error: 'APIレート制限に達しました',
        retryAfter,
        message: `${retryAfter}秒後に再試行してください`
      });
    }

    try {
      console.log('[GoogleBusinessAPI] APIからアカウント情報を取得します(handler)');
      const accounts = await getAccounts(userId);
      await saveAccountsToCache(userId, accounts);
      
      // 成功したAPI呼び出しを記録
      lastApiCallTime[userId] = Date.now();
      
      console.log(`[GoogleBusinessAPI] APIから ${accounts.length} 件のアカウント情報を取得・保存しました (handler)`);
      return res.status(200).json({ accounts, source: 'api' });
    } catch (error: any) {
      console.error('[GoogleBusinessAPI] アカウント取得・保存中のエラー(handler - main try):', error.message, 'Code:', error.code);
      
      if (error.code === 429 || error.message?.includes('quota') || error.message?.includes('Quota') || (error.status === 429) ) {
        console.warn('[GoogleBusinessAPI] クォータエラーのためキャッシュフォールバックを試みます(handler)');
        try {
          const { data: fbData, error: fbCacheError } = await supabase
            .from('google_business_accounts')
            .select('*')
            .eq('tenant_id', userId);
            
          if (fbCacheError) {
            console.error('[GoogleBusinessAPI] フォールバックキャッシュ取得エラー(handler):', fbCacheError.message, 'Code:', fbCacheError.code);
            return res.status(429).json({ error: 'APIの制限に達し、キャッシュの取得にも失敗しました', details: fbCacheError.message });
          }
          if (!fbData || fbData.length === 0) {
            return res.status(429).json({ error: 'APIの制限に達しました。キャッシュも利用できません' });
          }
          console.log(`[GoogleBusinessAPI] フォールバックキャッシュから ${fbData.length} 件のアカウント情報を返却します (handler)`);
          return res.status(200).json({ 
            accounts: fbData.map((account: CachedAccountTableRow) => ({ 
                name: `accounts/${account.account_id}`,
                displayName: account.display_name || '',
                accountName: account.account_name || '',
                type: account.type || '',
                locationCount: account.location_count || 0,
                primaryOwner: account.primary_owner || '',
                role: account.role || ''
            })),
            source: 'fallback-cache'
          });
        } catch (cacheErr: any) {
          console.error('[GoogleBusinessAPI] フォールバックキャッシュ処理中の致命的エラー(handler):', cacheErr.message);
          return res.status(500).json({ error: 'キャッシュのフォールバック処理中にエラーが発生しました', details: cacheErr.message });
        }
      }
      const statusCode = error.status || 500;
      return res.status(statusCode).json({ error: error.message || '予期せぬサーバーエラーが発生しました' });
    }
  } catch (finalErr: any) {
    console.error('[GoogleBusinessAPI] ハンドラ全体の致命的エラー(handler):', finalErr.message);
    return res.status(500).json({ error: '予期せぬエラーが発生しました (最上位catch)', details: finalErr.message });
  }
} 