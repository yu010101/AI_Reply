import { Plan } from '@/constants/plan';

// Subscription型の定義
export interface Subscription {
  id: string;
  tenant_id: string;
  plan: Plan;
  status: 'active' | 'canceled' | 'past_due';
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}

// SubscriptionFormData型の定義
export interface SubscriptionFormData {
  plan: Plan;
}

// CreateSubscriptionRequest型の定義
export interface CreateSubscriptionRequest {
  plan: Plan;
  priceId?: string;
}

// UpdateSubscriptionRequest型の定義
export interface UpdateSubscriptionRequest {
  plan?: Plan;
  priceId?: string;
}
