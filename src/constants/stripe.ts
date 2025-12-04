import { Plan } from './plan';

// Stripe価格IDの定義
export const STRIPE_PRICE_IDS: Record<Plan, string | null> = {
  free: null,
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC || null,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || null,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || null,
};
