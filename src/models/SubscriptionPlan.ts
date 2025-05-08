import { supabase } from '@/utils/supabase';

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  monthly_price: number;
  annual_price: number;
  features: {
    basic_analytics?: boolean;
    review_management?: boolean;
    ai_suggestions?: boolean;
    advanced_analytics?: boolean;
    multi_platform?: boolean;
    api_access?: boolean;
    priority_support?: boolean;
    white_label?: boolean;
    [key: string]: boolean | undefined;
  };
  limits: {
    users: number;
    locations: number;
    api_calls_per_day: number;
    [key: string]: number | undefined;
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// すべてのプランを取得
export const getAllPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('monthly_price', { ascending: true });
    
  if (error) {
    console.error('プラン取得エラー:', error);
    return [];
  }
  
  return data;
};

// 特定のプランを取得
export const getPlan = async (planId: number): Promise<SubscriptionPlan | null> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();
    
  if (error) {
    console.error('プラン取得エラー:', error);
    return null;
  }
  
  return data;
};

// 支払いサイクルに基づく価格を計算
export const getPlanPrice = (plan: SubscriptionPlan, billingCycle: 'monthly' | 'annual'): number => {
  if (billingCycle === 'annual') {
    return plan.annual_price;
  }
  return plan.monthly_price;
};

// プランの年間割引率を計算（%）
export const getAnnualDiscountPercentage = (plan: SubscriptionPlan): number => {
  if (plan.monthly_price === 0) return 0;
  
  const monthlyTotal = plan.monthly_price * 12;
  const annualTotal = plan.annual_price;
  
  return Math.round((1 - (annualTotal / monthlyTotal)) * 100);
}; 