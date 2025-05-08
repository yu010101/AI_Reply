import { supabase } from '@/utils/supabase';
import { getOrganizationSubscription } from './Subscription';
import { getPlan } from './SubscriptionPlan';

export interface UsageLimit {
  id: string;
  organization_id: string;
  resource_type: 'api_calls' | 'storage' | 'locations' | 'users';
  limit_value: number;
  current_usage: number;
  reset_at: string;
  created_at?: string;
  updated_at?: string;
}

// リソースタイプの定義
export enum ResourceType {
  API_CALLS = 'api_calls',
  STORAGE = 'storage',
  LOCATIONS = 'locations',
  USERS = 'users'
}

// 組織の使用量を取得
export const getOrganizationUsage = async (
  organizationId: string,
  resourceType: ResourceType
): Promise<UsageLimit | null> => {
  const { data, error } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('resource_type', resourceType)
    .single();

  if (error) {
    console.error('使用量取得エラー:', error);
    return null;
  }

  return data;
};

// プランに基づく使用量制限を取得
export const getPlanLimits = async (organizationId: string): Promise<Record<ResourceType, number>> => {
  // 組織のサブスクリプションを取得
  const subscription = await getOrganizationSubscription(organizationId);
  
  if (!subscription || !subscription.plan) {
    // サブスクリプションがない場合はFreeプランの制限を使用
    const freePlan = await getPlan(1); // ID 1はFreeプラン
    
    if (!freePlan) {
      // デフォルト値を返す
      return {
        [ResourceType.API_CALLS]: 100,
        [ResourceType.STORAGE]: 100 * 1024 * 1024, // 100MB
        [ResourceType.LOCATIONS]: 1,
        [ResourceType.USERS]: 1
      };
    }
    
    return {
      [ResourceType.API_CALLS]: freePlan.limits.api_calls_per_day || 100,
      [ResourceType.STORAGE]: (freePlan.limits.storage_mb || 100) * 1024 * 1024,
      [ResourceType.LOCATIONS]: freePlan.limits.locations || 1,
      [ResourceType.USERS]: freePlan.limits.users || 1
    };
  }
  
  const plan = subscription.plan;
  
  return {
    [ResourceType.API_CALLS]: plan.limits.api_calls_per_day || 100,
    [ResourceType.STORAGE]: (plan.limits.storage_mb || 100) * 1024 * 1024,
    [ResourceType.LOCATIONS]: plan.limits.locations || 1,
    [ResourceType.USERS]: plan.limits.users || 1
  };
};

// 使用量カウンターを初期化または更新
export const initOrUpdateUsageLimit = async (
  organizationId: string,
  resourceType: ResourceType
): Promise<UsageLimit | null> => {
  try {
    // 現在の使用量を取得
    let usageLimit = await getOrganizationUsage(organizationId, resourceType);
    
    // プランの制限を取得
    const planLimits = await getPlanLimits(organizationId);
    const limitValue = planLimits[resourceType];
    
    // 翌日のリセット時間を計算
    const resetAt = new Date();
    resetAt.setHours(0, 0, 0, 0);
    resetAt.setDate(resetAt.getDate() + 1);
    
    if (!usageLimit) {
      // 使用量レコードがない場合は新規作成
      const { data, error } = await supabase
        .from('usage_limits')
        .insert({
          organization_id: organizationId,
          resource_type: resourceType,
          limit_value: limitValue,
          current_usage: 0,
          reset_at: resetAt.toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('使用量初期化エラー:', error);
        return null;
      }
      
      return data;
    } else {
      // リセット時間が過ぎていれば使用量をリセット
      const now = new Date();
      const resetTime = new Date(usageLimit.reset_at);
      
      if (now >= resetTime) {
        // 使用量をリセットして新しいリセット時間を設定
        const { data, error } = await supabase
          .from('usage_limits')
          .update({
            current_usage: 0,
            limit_value: limitValue, // プラン変更があった場合に更新
            reset_at: resetAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', usageLimit.id)
          .select()
          .single();
          
        if (error) {
          console.error('使用量リセットエラー:', error);
          return null;
        }
        
        return data;
      }
      
      // プランの制限値が変更されていれば更新
      if (usageLimit.limit_value !== limitValue) {
        const { data, error } = await supabase
          .from('usage_limits')
          .update({
            limit_value: limitValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', usageLimit.id)
          .select()
          .single();
          
        if (error) {
          console.error('使用量制限更新エラー:', error);
          return null;
        }
        
        return data;
      }
      
      return usageLimit;
    }
  } catch (error) {
    console.error('使用量管理エラー:', error);
    return null;
  }
};

// 使用量をインクリメント
export const incrementUsage = async (
  organizationId: string,
  resourceType: ResourceType,
  amount: number = 1
): Promise<boolean> => {
  try {
    // まず使用量レコードが存在することを確認
    let usageLimit = await initOrUpdateUsageLimit(organizationId, resourceType);
    
    if (!usageLimit) {
      return false;
    }
    
    // 使用量をインクリメント
    const { error } = await supabase
      .from('usage_limits')
      .update({
        current_usage: usageLimit.current_usage + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', usageLimit.id);
      
    if (error) {
      console.error('使用量更新エラー:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('使用量インクリメントエラー:', error);
    return false;
  }
};

// 使用量制限をチェックして、制限を超えているかどうかを判断
export const checkUsageLimit = async (
  organizationId: string,
  resourceType: ResourceType,
  incrementOnCheck: boolean = false
): Promise<{ allowed: boolean; current: number; limit: number; remainingPercentage: number }> => {
  try {
    // 使用量を取得（または初期化）
    let usageLimit = await initOrUpdateUsageLimit(organizationId, resourceType);
    
    if (!usageLimit) {
      // エラーが発生した場合、安全のために制限に達したと判断
      return { allowed: false, current: 0, limit: 0, remainingPercentage: 0 };
    }
    
    // インクリメントフラグが有効な場合、使用量をインクリメント
    if (incrementOnCheck) {
      await incrementUsage(organizationId, resourceType);
      usageLimit.current_usage += 1;
    }
    
    // 無制限（-1）の場合は常に許可
    if (usageLimit.limit_value === -1) {
      return { 
        allowed: true, 
        current: usageLimit.current_usage, 
        limit: -1,
        remainingPercentage: 100 
      };
    }
    
    // 現在の使用量が制限以下かチェック
    const allowed = usageLimit.current_usage < usageLimit.limit_value;
    
    // 残りの割合を計算
    const remainingPercentage = usageLimit.limit_value > 0
      ? Math.max(0, Math.round((1 - usageLimit.current_usage / usageLimit.limit_value) * 100))
      : 0;
    
    return {
      allowed,
      current: usageLimit.current_usage,
      limit: usageLimit.limit_value,
      remainingPercentage
    };
  } catch (error) {
    console.error('使用量チェックエラー:', error);
    // エラーが発生した場合、安全のために制限に達したと判断
    return { allowed: false, current: 0, limit: 0, remainingPercentage: 0 };
  }
}; 