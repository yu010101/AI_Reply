import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// テスト環境またはSupabase設定が無い場合のダミーURL
const DUMMY_SUPABASE_URL = 'https://test-project.supabase.co';
const DUMMY_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QtcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTY1NzEyMDB9.test-key';

const isConfigured = supabaseUrl && supabaseAnonKey;

if (typeof window === 'undefined') {
  // サーバーサイドでのログ出力
  console.log('[Supabase] URL:', supabaseUrl ? '設定済み' : '未設定（ダミー使用）');
  console.log('[Supabase] Anon Key:', supabaseAnonKey ? '設定済み' : '未設定（ダミー使用）');
}

// 環境変数が設定されていない場合はダミー値を使用（テスト用）
const finalUrl = isConfigured ? supabaseUrl : DUMMY_SUPABASE_URL;
const finalKey = isConfigured ? supabaseAnonKey : DUMMY_SUPABASE_KEY;

export const supabase: SupabaseClient = createClient(finalUrl, finalKey);

// Supabaseが設定されているかどうかを確認するフラグ
export const isSupabaseConfigured = isConfigured;

// 認証関連の関数
export const signIn = async (email: string, password: string) => {
  console.log('[Supabase] ログイン試行:', { email });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  console.log('[Supabase] ログイン結果:', { data, error });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// データ取得関連の関数
export const getLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select('*');
  return { data, error };
};

export const getReviews = async (locationId?: string) => {
  let query = supabase
    .from('reviews')
    .select('*');

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  return { data, error };
};

export const updateLocationTone = async (locationId: string, tone: string) => {
  const { data, error } = await supabase
    .from('locations')
    .update({ tone })
    .eq('id', locationId);
  return { data, error };
};

// 型定義
export interface Location {
  id: string;
  name: string;
  tone: string;
  line_user_id: string;
  created_at: string;
}

export interface Review {
  id: string;
  location_id: string;
  author: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

export interface Draft {
  id: string;
  review_id: string;
  content: string;
  token_usage: number;
  created_at: string;
}

// テナントテーブルを作成する関数
export const createTenantsTable = async () => {
  try {
    console.log('[Supabase] テナントテーブル作成開始');
    
    const { error } = await supabase.rpc('create_tenants_table');
    if (error) {
      console.error('[Supabase] テナントテーブル作成エラー:', error);
      throw error;
    }
    
    console.log('[Supabase] テナントテーブル作成成功');
    return true;
  } catch (error) {
    console.error('[Supabase] テナントテーブル作成エラー:', error);
    return false;
  }
}; 