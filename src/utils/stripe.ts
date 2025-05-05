import { loadStripe } from '@stripe/stripe-js';
import { PLAN_PRICES, PLAN_LIMITS } from '@/constants/plan';

// StripeのAPIキー
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Stripeの初期化
export const getStripe = async () => {
  const stripe = await loadStripe(STRIPE_PUBLIC_KEY!);
  return stripe;
};

// 定数をエクスポート
export { PLAN_PRICES, PLAN_LIMITS };

// サブスクリプション作成処理
export const createSubscription = async (planId: string, customerId?: string) => {
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
};

// サブスクリプション更新処理
export const updateSubscription = async (subscriptionId: string, planId: string) => {
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
};

// サブスクリプション解約処理
export const cancelSubscription = async (subscriptionId: string) => {
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
};

// 顧客ポータルへのリンク生成
export const createCustomerPortalLink = async (customerId: string) => {
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
};

// プラン価格フォーマット
export const formatPrice = (plan: keyof typeof PLAN_PRICES) => {
  const price = PLAN_PRICES[plan];
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(price);
};

export const createCheckoutSession = async (priceId: string) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    if (!response.ok) {
      throw new Error('セッションの作成に失敗しました');
    }

    const { sessionId } = await response.json();
    const stripe = await getStripe();

    if (!stripe) {
      throw new Error('Stripeの初期化に失敗しました');
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('支払い処理エラー:', error);
    throw error;
  }
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