export type Plan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxLocations: number;
  maxReviewsPerMonth: number;
  maxAIRepliesPerMonth: number;
  features: string[];
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxLocations: 1,
    maxReviewsPerMonth: 50,
    maxAIRepliesPerMonth: 20,
    features: ['基本的なレビュー管理', '手動返信'],
  },
  basic: {
    maxLocations: 3,
    maxReviewsPerMonth: 200,
    maxAIRepliesPerMonth: 100,
    features: ['基本的なレビュー管理', 'AI返信生成', 'LINE通知'],
  },
  pro: {
    maxLocations: 10,
    maxReviewsPerMonth: 1000,
    maxAIRepliesPerMonth: 500,
    features: ['基本的なレビュー管理', 'AI返信生成', 'LINE通知', 'カスタムトーン設定', '統計分析'],
  },
  enterprise: {
    maxLocations: 50,
    maxReviewsPerMonth: 5000,
    maxAIRepliesPerMonth: 2500,
    features: ['基本的なレビュー管理', 'AI返信生成', 'LINE通知', 'カスタムトーン設定', '統計分析', '優先サポート', 'カスタム統合'],
  },
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  basic: 4900,
  pro: 14900,
  enterprise: 49900,
}; 