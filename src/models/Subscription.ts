import { supabase } from '@/utils/supabase';
import { SubscriptionPlan, getPlan } from './SubscriptionPlan';

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: number;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  billing_cycle: 'monthly' | 'annual';
  trial_start?: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_provider?: 'stripe' | 'paypal';
  payment_provider_subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan;
}

export interface PaymentHistory {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  invoice_url?: string;
  receipt_url?: string;
  payment_provider_transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

// 組織のサブスクリプション取得
export const getOrganizationSubscription = async (organizationId: string): Promise<SubscriptionWithPlan | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plan_id(*)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();
    
  if (error) {
    console.error('サブスクリプション取得エラー:', error);
    return null;
  }
  
  return data;
};

// サブスクリプションの作成/更新
export const createOrUpdateSubscription = async (
  subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
): Promise<Subscription | null> => {
  // 既存のサブスクリプションをチェック
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', subscription.organization_id)
    .eq('status', 'active')
    .single();
    
  if (existingSubscription) {
    // 既存のサブスクリプションを更新
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: subscription.plan_id,
        status: subscription.status,
        billing_cycle: subscription.billing_cycle,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_provider: subscription.payment_provider,
        payment_provider_subscription_id: subscription.payment_provider_subscription_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)
      .select()
      .single();
      
    if (error) {
      console.error('サブスクリプション更新エラー:', error);
      return null;
    }
    
    return data;
  } else {
    // 新規サブスクリプションを作成
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();
      
    if (error) {
      console.error('サブスクリプション作成エラー:', error);
      return null;
    }
    
    return data;
  }
};

// プラン変更
export const changePlan = async (
  subscriptionId: string,
  newPlanId: number,
  billingCycle?: 'monthly' | 'annual'
): Promise<SubscriptionWithPlan | null> => {
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();
    
  if (subError || !subscription) {
    console.error('サブスクリプション取得エラー:', subError);
    return null;
  }
  
  // 新しいプランの取得
  const newPlan = await getPlan(newPlanId);
  if (!newPlan) {
    console.error('プラン取得エラー:', newPlanId);
    return null;
  }
  
  // 支払いサイクルが指定されていない場合は現在の設定を維持
  const newBillingCycle = billingCycle || subscription.billing_cycle;
  
  // 新しい請求期間の計算
  const now = new Date();
  const endDate = new Date();
  
  if (newBillingCycle === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  
  // サブスクリプションの更新
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: newPlanId,
      billing_cycle: newBillingCycle,
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', subscriptionId)
    .select(`
      *,
      plan:plan_id(*)
    `)
    .single();
    
  if (error) {
    console.error('プラン変更エラー:', error);
    return null;
  }
  
  // TODO: 支払いプロバイダーのサブスクリプション更新（Stripe APIなど）
  
  return data;
};

// サブスクリプションのキャンセル
export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription | null> => {
  // 即時キャンセルか期間終了時キャンセルか
  if (cancelAtPeriodEnd) {
    // 期間終了時にキャンセルするよう設定
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();
      
    if (error) {
      console.error('サブスクリプションキャンセル設定エラー:', error);
      return null;
    }
    
    return data;
  } else {
    // 即時キャンセル
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();
      
    if (error) {
      console.error('サブスクリプション即時キャンセルエラー:', error);
      return null;
    }
    
    return data;
  }
};

// 支払い履歴の取得
export const getPaymentHistory = async (subscriptionId: string): Promise<PaymentHistory[]> => {
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('payment_date', { ascending: false });
    
  if (error) {
    console.error('支払い履歴取得エラー:', error);
    return [];
  }
  
  return data;
};

// 支払い記録の追加
export const addPaymentRecord = async (
  payment: Omit<PaymentHistory, 'id' | 'created_at' | 'updated_at'>
): Promise<PaymentHistory | null> => {
  const { data, error } = await supabase
    .from('payment_history')
    .insert(payment)
    .select()
    .single();
    
  if (error) {
    console.error('支払い記録追加エラー:', error);
    return null;
  }
  
  return data;
}; 