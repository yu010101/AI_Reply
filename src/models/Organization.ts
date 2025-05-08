import { supabase } from '@/utils/supabase';
import { User } from './User';
import { SubscriptionPlan } from './SubscriptionPlan';
import { Subscription } from './Subscription';

export interface Organization {
  id: string;
  name: string;
  display_name?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationWithSubscription extends Organization {
  subscription?: Subscription;
  subscription_plan?: SubscriptionPlan;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: number;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
  user?: User;
  role?: Role;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: {
    all?: boolean;
    reviews?: {
      read?: boolean;
      write?: boolean;
    };
    settings?: {
      read?: boolean;
      write?: boolean;
    };
    analytics?: {
      read?: boolean;
    };
    users?: {
      read?: boolean;
      write?: boolean;
    };
    billing?: {
      read?: boolean;
      write?: boolean;
    };
  };
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: number;
  token: string;
  invited_by: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at?: string;
  updated_at?: string;
  organization?: Organization;
  role?: Role;
}

// 組織の取得
export const getOrganization = async (organizationId: string): Promise<Organization | null> => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('組織の取得エラー:', error);
    return null;
  }

  return data;
};

// ユーザーが所属する組織の取得
export const getUserOrganizations = async (userId: string): Promise<OrganizationWithSubscription[]> => {
  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      organizations:organization_id(
        *,
        subscriptions:subscriptions(
          *,
          subscription_plan:plan_id(*)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('ユーザー所属組織の取得エラー:', error);
    return [];
  }

  // 整形: 組織ごとに最新のサブスクリプション情報を付与
  return data.map(item => {
    // データの検証と型変換
    if (!item.organizations || typeof item.organizations !== 'object') {
      console.error('組織データ形式エラー:', item);
      return {
        id: '',
        name: 'エラー: データ形式が不正です'
      } as OrganizationWithSubscription;
    }

    const org = item.organizations as unknown as Organization;
    
    // subscriptionsプロパティの存在チェック
    const subscriptionsData = (item.organizations as any).subscriptions;
    const subscriptions = Array.isArray(subscriptionsData) ? subscriptionsData : [];
    
    // 有効なサブスクリプションがあれば、それを使用
    const activeSubscription = subscriptions.find((sub: any) => sub.status === 'active') || subscriptions[0];
    
    return {
      ...org,
      subscription: activeSubscription,
      subscription_plan: activeSubscription?.subscription_plan
    };
  });
};

// 組織のメンバー一覧取得
export const getOrganizationMembers = async (organizationId: string): Promise<OrganizationMember[]> => {
  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      *,
      user:user_id(id, email, display_name, avatar_url),
      role:role_id(*)
    `)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('組織メンバー取得エラー:', error);
    return [];
  }

  return data as OrganizationMember[];
};

// 組織の作成
export const createOrganization = async (
  organization: Omit<Organization, 'id' | 'created_at' | 'updated_at'>,
  userId: string,
  roleId: number = 1 // デフォルトは管理者ロール
): Promise<Organization | null> => {
  // トランザクション開始
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert(organization)
    .select()
    .single();

  if (orgError) {
    console.error('組織作成エラー:', orgError);
    return null;
  }

  // ユーザーを組織のメンバーとして追加（作成者は管理者）
  const { error: memberError } = await supabase
    .from('organization_users')
    .insert({
      organization_id: orgData.id,
      user_id: userId,
      role_id: roleId,
      is_primary: true
    });

  if (memberError) {
    console.error('組織メンバー追加エラー:', memberError);
    // ロールバック（組織を削除）
    await supabase.from('organizations').delete().eq('id', orgData.id);
    return null;
  }

  // Freeプランのサブスクリプションを自動作成
  const now = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 100); // 無料プランは実質無期限

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: orgData.id,
      plan_id: 1, // Free plan
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString()
    });

  if (subError) {
    console.error('サブスクリプション作成エラー:', subError);
    // エラーログを残すだけで、組織作成自体はロールバックしない
  }

  return orgData;
};

// 組織の更新
export const updateOrganization = async (
  organizationId: string,
  organization: Partial<Organization>
): Promise<Organization | null> => {
  const { data, error } = await supabase
    .from('organizations')
    .update(organization)
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('組織更新エラー:', error);
    return null;
  }

  return data;
};

// メンバーの招待
export const inviteUserToOrganization = async (
  organizationId: string,
  email: string,
  roleId: number,
  invitedBy: string
): Promise<Invitation | null> => {
  // トークン生成（ランダム文字列）
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // 有効期限（24時間）
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role_id: roleId,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('招待作成エラー:', error);
    return null;
  }

  // TODO: 招待メールの送信処理

  return data;
};

// 招待の承諾
export const acceptInvitation = async (
  token: string,
  userId: string
): Promise<boolean> => {
  // 招待の確認
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invitation) {
    console.error('招待の取得エラー:', inviteError || '招待が見つかりません');
    return false;
  }

  // 有効期限のチェック
  if (new Date(invitation.expires_at) < new Date()) {
    // 招待ステータスを期限切れに更新
    await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    
    console.error('招待の有効期限が切れています');
    return false;
  }

  // ユーザーを組織のメンバーとして追加
  const { error: memberError } = await supabase
    .from('organization_users')
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role_id: invitation.role_id,
      is_primary: false
    });

  if (memberError) {
    console.error('組織メンバー追加エラー:', memberError);
    return false;
  }

  // 招待ステータスを承諾済みに更新
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  if (updateError) {
    console.error('招待ステータス更新エラー:', updateError);
    // ロールバック（メンバー追加を取り消し）
    await supabase
      .from('organization_users')
      .delete()
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId);
    return false;
  }

  return true;
};

// ロールの一覧取得
export const getRoles = async (): Promise<Role[]> => {
  const { data, error } = await supabase
    .from('roles')
    .select('*');

  if (error) {
    console.error('ロール取得エラー:', error);
    return [];
  }

  return data as Role[];
};

// ユーザーの組織でのロール取得
export const getUserOrganizationRole = async (
  userId: string,
  organizationId: string
): Promise<Role | null> => {
  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      role:role_id(*)
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('ユーザーロール取得エラー:', error);
    return null;
  }

  return data.role as Role;
}; 