import { useState } from 'react';
import { Plan, PLAN_FEATURES, PLAN_PRICES } from '@/constants/plan';
import { STRIPE_PRICE_IDS } from '@/constants/stripe';
// Stripe checkout sessionはAPI経由で作成
import { SubscriptionFormData } from '@/types/subscription';

type PlanSelectorProps = {
  currentPlan?: Plan;
  onSubmit: (data: SubscriptionFormData) => Promise<void>;
};

export default function PlanSelector({ currentPlan, onSubmit }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan || 'free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (selectedPlan === 'free') {
        await onSubmit({ plan: 'free' });
      } else {
        const priceId = STRIPE_PRICE_IDS[selectedPlan];
        if (!priceId) {
          throw new Error('価格IDが見つかりません');
        }
        // Stripe checkout sessionをAPI経由で作成
        const response = await fetch('/api/subscriptions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('チェックアウトセッションの作成に失敗しました');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          プラン選択
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          ご利用の目的に合わせてプランを選択してください
        </p>
      </div>

      {error && (
        <div className="mt-8 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-12 space-y-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(['free', 'basic', 'pro', 'enterprise'] as Plan[]).map((plan) => (
            <div
              key={plan}
              className={`relative rounded-lg border ${
                selectedPlan === plan
                  ? 'border-indigo-600 ring-2 ring-indigo-600'
                  : 'border-gray-200'
              } p-6 shadow-sm`}
            >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {plan === 'free' && 'フリープラン'}
                    {plan === 'basic' && 'ベーシックプラン'}
                    {plan === 'pro' && 'プロプラン'}
                    {plan === 'enterprise' && 'エンタープライズプラン'}
                  </h3>
                  <p className="mt-4 text-3xl font-extrabold text-gray-900">
                    {PLAN_PRICES[plan] === 0
                      ? '無料'
                      : `¥${PLAN_PRICES[plan].toLocaleString()}/月`}
                  </p>
                  <ul className="mt-6 space-y-4">
                    {PLAN_FEATURES[plan].map((feature: string) => (
                      <li key={feature} className="flex items-start">
                        <svg
                          className="h-5 w-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="ml-3 text-base text-gray-500">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`block w-full rounded-md border ${
                      selectedPlan === plan
                        ? 'bg-indigo-600 text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-300'
                    } px-4 py-2 text-center text-sm font-medium shadow-sm hover:bg-gray-50`}
                  >
                    {selectedPlan === plan ? '選択中' : '選択する'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || selectedPlan === currentPlan}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '処理中...' : 'プランを変更する'}
          </button>
        </div>
      </form>
    </div>
  );
} 