import { supabase } from '@/utils/supabase';

export interface User {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// 現在のユーザーを取得
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('ユーザー取得エラー:', error);
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    // その他のユーザー情報はプロフィールテーブルから取得する必要がある場合もある
  };
};

// ユーザープロフィールの取得
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('ユーザープロフィール取得エラー:', error);
    return null;
  }
  
  return data;
};

// ユーザープロフィールの更新
export const updateUserProfile = async (
  userId: string,
  profile: Partial<User>
): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) {
    console.error('ユーザープロフィール更新エラー:', error);
    return null;
  }
  
  return data;
}; 