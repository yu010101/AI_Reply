// 共通型定義のエクスポート

export type { Tenant, CreateTenantRequest, UpdateTenantRequest } from './tenant';

// Location型の定義
export interface Location {
  id: string;
  name: string;
  tone: string;
  line_user_id?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Review型の定義
export interface Review {
  id: string;
  location_id: string;
  author: string;
  rating: number;
  comment: string;
  status: 'pending' | 'responded' | 'ignored';
  created_at?: string;
  updated_at?: string;
}

// Reply型の定義
export interface Reply {
  id: string;
  review_id: string;
  content: string;
  status: 'draft' | 'sent';
  created_at?: string;
  updated_at?: string;
}

// Subscription型の定義
export interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due';
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}
