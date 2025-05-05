import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[Supabase] URL:', supabaseUrl ? '設定済み' : '未設定');
console.log('[Supabase] Anon Key:', supabaseAnonKey ? '設定済み' : '未設定');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] 環境変数が設定されていません');
  throw new Error('Supabaseの設定が正しくありません');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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