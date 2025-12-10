import { createClient } from '@supabase/supabase-js';
import { NextApiRequest } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 環境変数が設定されていない場合のエラーハンドリング
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Supabaseの環境変数が設定されていません');
  }
}

// Supabaseクライアントを作成
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// 認証関連の関数
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
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
    const { error } = await supabase.rpc('create_tenants_table');
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// サーバーサイド用：リクエストからセッションを取得
export async function getServerSession(req: NextApiRequest) {
  // Authorizationヘッダーからトークンを取得
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { user, token };
    }
  }

  // Cookieからトークンを取得
  const cookies = req.cookies;
  const accessToken = cookies['sb-access-token'] || cookies['sb-fmonerzmxohwkisdagvm-auth-token'];

  if (accessToken) {
    try {
      // JSON形式の場合はパース
      let token = accessToken;
      if (accessToken.startsWith('{')) {
        const parsed = JSON.parse(accessToken);
        token = parsed.access_token || parsed.token;
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return { user, token };
      }
    } catch (e) {
      // パースエラーは無視
    }
  }

  // supabase.auth.getSession()も試行（クライアントサイドレンダリング時）
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return { user: session.user, token: session.access_token };
  }

  return null;
}

// サーバーサイド用：認証済みSupabaseクライアントを作成
export function createAuthenticatedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}
