// 共通型定義のエクスポート

export type { Tenant, CreateTenantRequest, UpdateTenantRequest } from './tenant';

// Location型の定義（location.tsから再エクスポート）
export type { Location, LocationFormData } from './location';

// Review型の定義（review.tsから再エクスポート）
export type { Review, ReviewStatus } from './review';

// Reply型の定義（reply.tsから再エクスポート）
export type { Reply, ReplyFormData } from './reply';

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
