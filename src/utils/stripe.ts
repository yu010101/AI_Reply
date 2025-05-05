import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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
    const stripe = await stripePromise;

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