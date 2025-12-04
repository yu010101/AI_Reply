import { loadStripe } from '@stripe/stripe-js';
import { PLAN_PRICES, PLAN_LIMITS } from '@/constants/plan';
import Stripe from 'stripe';

// StripeのAPIキー
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// 環境変数の検証
if (!STRIPE_SECRET_KEY && typeof window === 'undefined') {
  console.warn('警告: STRIPE_SECRET_KEYが設定されていません。Stripe機能が正常に動作しない可能性があります。');
}

export const stripe = STRIPE_SECRET_KEY 
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
    })
  : null as any; // ビルド時のエラー回避のため、nullを許可（実際の使用時はエラーハンドリングが必要）

// Stripeの初期化
export const getStripe = async () => {
  const stripe = await loadStripe(STRIPE_PUBLIC_KEY!);
  return stripe;
};

// 定数をエクスポート
export { PLAN_PRICES, PLAN_LIMITS };

// クライアントサイドの関数
export const clientApi = {
  // サブスクリプション作成処理
  createSubscription: async (planId: string, customerId?: string) => {
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          customerId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('サブスクリプション作成エラー:', error);
      throw error;
    }
  },

  // サブスクリプション更新処理
  updateSubscription: async (subscriptionId: string, planId: string) => {
    try {
      const response = await fetch('/api/subscriptions/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          planId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('サブスクリプション更新エラー:', error);
      throw error;
    }
  },

  // サブスクリプション解約処理
  cancelSubscription: async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('サブスクリプション解約エラー:', error);
      throw error;
    }
  },

  // 顧客ポータルへのリンク生成
  createCustomerPortalLink: async (customerId: string) => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('顧客ポータルリンク生成エラー:', error);
      throw error;
    }
  },
};

// 顧客ポータルリンク生成関数を直接エクスポート
export const createCustomerPortalLink = clientApi.createCustomerPortalLink;

// プラン価格フォーマット
export const formatPrice = (plan: keyof typeof PLAN_PRICES) => {
  const price = PLAN_PRICES[plan];
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(price);
};

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

// サーバーサイドの関数
export const serverApi = {
  createCheckoutSession: async ({
    priceId,
    customerId,
    successUrl,
    cancelUrl,
    metadata,
  }: CreateCheckoutSessionParams) => {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });

      return session;
    } catch (error) {
      console.error('Stripe checkout session作成エラー:', error);
      throw error;
    }
  },

  createCustomer: async (email: string, name: string) => {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      console.error('Stripe customer作成エラー:', error);
      throw error;
    }
  },

  getSubscription: async (subscriptionId: string) => {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Stripe subscription取得エラー:', error);
      throw error;
    }
  },

  cancelSubscription: async (subscriptionId: string) => {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Stripe subscriptionキャンセルエラー:', error);
      throw error;
    }
  },

  updateSubscription: async (subscriptionId: string, priceId: string) => {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
      });
      return updatedSubscription;
    } catch (error) {
      console.error('Stripe subscription更新エラー:', error);
      throw error;
    }
  },

  handleWebhookEvent: async (body: Buffer, signature: string) => {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  },
};

export const createCustomerPortalSession = async () => {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('セッションの作成に失敗しました');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('カスタマーポータルセッション作成エラー:', error);
    throw error;
  }
}; 