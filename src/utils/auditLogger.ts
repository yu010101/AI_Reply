import { supabase } from './supabase';

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'password_change'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_backup_codes_regenerated'
  | 'user_role_update'
  | 'user_removed'
  | 'organization_join'
  | 'organization_leave'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_canceled'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'api_key_created'
  | 'api_key_deleted';

export type ResourceType = 
  | 'user'
  | 'organization'
  | 'organization_user'
  | 'invitation'
  | 'subscription'
  | 'payment'
  | 'api_key';

interface AuditLogData {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 監査ログを記録する関数
 * 
 * @param data 監査ログデータ
 * @returns ログ記録の成功・失敗を示すブール値
 */
export const logAuditEvent = async (data: AuditLogData): Promise<boolean> => {
  try {
    const { 
      userId, 
      action, 
      resourceType, 
      resourceId, 
      details = {}, 
      ipAddress, 
      userAgent 
    } = data;
    
    // 現在のタイムスタンプと追加情報を含む詳細オブジェクト
    const detailsWithTimestamp: Record<string, any> = {
      ...details,
      timestamp: new Date().toISOString()
    };
    
    // IPアドレスとユーザーエージェントが指定されている場合は追加
    if (ipAddress) {
      detailsWithTimestamp.ip_address = ipAddress;
    }
    
    if (userAgent) {
      detailsWithTimestamp.user_agent = userAgent;
    }
    
    // ログをデータベースに記録
    const { error } = await supabase.from('audit_logs').insert([{
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: JSON.stringify(detailsWithTimestamp),
      created_at: new Date().toISOString()
    }]);
    
    if (error) {
      console.error('監査ログ記録エラー:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
    return false;
  }
};

/**
 * ログイン成功イベントを記録
 */
export const logLoginSuccess = async (
  userId: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<boolean> => {
  return logAuditEvent({
    userId,
    action: 'login',
    resourceType: 'user',
    resourceId: userId,
    details: { status: 'success' },
    ipAddress,
    userAgent
  });
};

/**
 * ログイン失敗イベントを記録
 */
export const logLoginFailure = async (
  email: string,
  reason: string,
  ipAddress?: string, 
  userAgent?: string
): Promise<boolean> => {
  // ユーザーが存在しない場合もログを記録するため、ダミーIDを使用
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  
  return logAuditEvent({
    userId: dummyUserId,
    action: 'login',
    resourceType: 'user',
    resourceId: dummyUserId,
    details: { 
      status: 'failure',
      email,
      reason
    },
    ipAddress,
    userAgent
  });
};

/**
 * パスワード変更イベントを記録
 */
export const logPasswordChange = async (
  userId: string
): Promise<boolean> => {
  return logAuditEvent({
    userId,
    action: 'password_change',
    resourceType: 'user',
    resourceId: userId
  });
};

/**
 * 組織のユーザー権限変更イベントを記録
 */
export const logUserRoleUpdate = async (
  userId: string,
  resourceId: string,
  details: {
    organizationId: string;
    targetUserId: string;
    oldRoleId: number;
    newRoleId: number;
  }
): Promise<boolean> => {
  return logAuditEvent({
    userId,
    action: 'user_role_update',
    resourceType: 'organization_user',
    resourceId,
    details
  });
};

/**
 * セッション情報を保存
 */
export const logSessionInfo = async (
  userId: string,
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.from('user_sessions').insert([{
      id: sessionId,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_current: true,
      created_at: new Date().toISOString()
    }]);
    
    if (error) {
      console.error('セッション情報記録エラー:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('セッション情報記録エラー:', error);
    return false;
  }
}; 