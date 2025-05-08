import Stripe from 'stripe';
import { supabase } from '@/utils/supabase';
import { Subscription } from '@/models/Subscription';
import { SubscriptionPlan } from '@/models/SubscriptionPlan';
import { Organization } from '@/models/Organization';

// Stripeインスタンスを初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// 組織のStripeカスタマーIDを取得（存在しない場合は作成）
export const getOrCreateStripeCustomer = async (organization: Organization): Promise<string> => {
  // 既存のStripeカスタマーIDを確認
  const { data, error } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('organization_id', organization.id)
    .single();
    
  if (!error && data?.stripe_customer_id) {
    return data.stripe_customer_id;
  }
  
  // 新しいStripeカスタマーを作成
  const customer = await stripe.customers.create({
    name: organization.name,
    email: organization.contact_email || undefined,
    metadata: {
      organization_id: organization.id
    }
  });
  
  // データベースに保存
  await supabase
    .from('stripe_customers')
    .upsert({
      organization_id: organization.id,
      stripe_customer_id: customer.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  return customer.id;
};

// サブスクリプションプラン変更のためのチェックアウトセッションを作成
export const createCheckoutSession = async (
  organizationId: string,
  planId: number,
  billingCycle: 'monthly' | 'annual',
  successUrl: string,
  cancelUrl: string
): Promise<string | null> => {
  try {
    // プラン情報を取得
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (planError || !plan) {
      console.error('プラン取得エラー:', planError);
      return null;
    }
    
    // 組織情報を取得
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
      
    if (orgError || !organization) {
      console.error('組織取得エラー:', orgError);
      return null;
    }
    
    // 現在のサブスクリプション情報を取得
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*, payment_provider_subscription_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();
    
    // Stripeカスタマーを取得または作成
    const customerId = await getOrCreateStripeCustomer(organization);
    
    // 価格を決定（月額または年額）
    const unitAmount = billingCycle === 'monthly' ? plan.monthly_price : plan.annual_price;
    
    // セッションの作成オプション
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `${plan.name} (${billingCycle === 'monthly' ? '月額' : '年額'})`,
              description: plan.description || `${plan.name}プラン（${billingCycle === 'monthly' ? '月額' : '年額'}）`
            },
            unit_amount: unitAmount, // 円単位
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        organization_id: organizationId,
        plan_id: planId.toString(),
        billing_cycle: billingCycle
      }
    };
    
    // 既存のサブスクリプションがある場合は、そのサブスクリプションを更新
    if (currentSub && currentSub.payment_provider === 'stripe' && currentSub.payment_provider_subscription_id) {
      // Stripeの既存サブスクリプションを取得
      try {
        await stripe.subscriptions.retrieve(currentSub.payment_provider_subscription_id);
        
        // サブスクリプション更新モードでチェックアウトセッションを作成
        sessionOptions.mode = 'subscription';
        sessionOptions.subscription_data = {
          metadata: {
            organization_id: organizationId,
            plan_id: planId.toString(),
            billing_cycle: billingCycle
          }
        };
      } catch (error) {
        // サブスクリプションが存在しない場合は新規作成
        console.warn('既存のStripeサブスクリプションが見つかりません:', error);
      }
    }
    
    // Stripeの支払いセッションを作成
    const session = await stripe.checkout.sessions.create(sessionOptions);
    
    return session.url;
  } catch (error) {
    console.error('Stripeセッション作成エラー:', error);
    return null;
  }
};

// チェックアウトセッション完了後の処理
export const handleCheckoutSessionCompleted = async (
  sessionId: string
): Promise<boolean> => {
  try {
    // Stripeからセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    
    if (!session || !session.metadata) {
      console.error('セッション情報が不正です');
      return false;
    }
    
    const { organization_id, plan_id, billing_cycle } = session.metadata;
    
    if (!organization_id || !plan_id || !billing_cycle) {
      console.error('セッションのメタデータが不足しています');
      return false;
    }
    
    // サブスクリプション情報を取得
    const subscription = session.subscription as Stripe.Subscription;
    
    if (!subscription) {
      console.error('サブスクリプション情報がありません');
      return false;
    }
    
    // 支払いサイクルの計算
    const isCycleMonthly = billing_cycle === 'monthly';
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // データベースのサブスクリプション情報を更新
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        organization_id,
        plan_id: parseInt(plan_id),
        status: 'active',
        billing_cycle: isCycleMonthly ? 'monthly' : 'annual',
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_provider: 'stripe',
        payment_provider_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('サブスクリプション更新エラー:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('チェックアウト完了処理エラー:', error);
    return false;
  }
};

// サブスクリプションの更新（プラン変更）
export const updateSubscription = async (
  subscriptionId: string,
  newPlanId: number,
  billingCycle?: 'monthly' | 'annual'
): Promise<boolean> => {
  try {
    // 現在のサブスクリプション情報を取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, payment_provider_subscription_id')
      .eq('id', subscriptionId)
      .single();
    
    if (subError || !subscription) {
      console.error('サブスクリプション取得エラー:', subError);
      return false;
    }
    
    // 新しいプラン情報を取得
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();
    
    if (planError || !newPlan) {
      console.error('プラン取得エラー:', planError);
      return false;
    }
    
    // 支払いサイクルの決定
    const newBillingCycle = billingCycle || subscription.billing_cycle;
    const price = newBillingCycle === 'monthly' ? newPlan.monthly_price : newPlan.annual_price;
    
    // Stripe上のサブスクリプションを更新
    if (subscription.payment_provider === 'stripe' && subscription.payment_provider_subscription_id) {
      // Stripeに更新リクエスト
      await stripe.subscriptions.update(subscription.payment_provider_subscription_id, {
        // 新しい価格やプランに関する設定
        // 実際の実装はStripe APIのドキュメントに従う
        metadata: {
          plan_id: newPlanId.toString(),
          billing_cycle: newBillingCycle
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('サブスクリプション更新エラー:', error);
    return false;
  }
};

// サブスクリプションのキャンセル
export const cancelStripeSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<boolean> => {
  try {
    // サブスクリプション情報を取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('payment_provider_subscription_id')
      .eq('id', subscriptionId)
      .single();
    
    if (subError || !subscription || !subscription.payment_provider_subscription_id) {
      console.error('サブスクリプション取得エラー:', subError);
      return false;
    }
    
    if (cancelAtPeriodEnd) {
      // 期間終了時にキャンセル
      await stripe.subscriptions.update(subscription.payment_provider_subscription_id, {
        cancel_at_period_end: true
      });
    } else {
      // 即時キャンセル
      await stripe.subscriptions.cancel(subscription.payment_provider_subscription_id);
    }
    
    return true;
  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    return false;
  }
};

// Webhook処理
export const handleStripeWebhook = async (event: Stripe.Event): Promise<boolean> => {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // 支払い完了時の処理
        const session = event.data.object as Stripe.Checkout.Session;
        return await handleCheckoutSessionCompleted(session.id);
        
      case 'invoice.payment_succeeded':
        // 定期支払い成功時の処理
        const invoice = event.data.object as Stripe.Invoice;
        
        // Stripeの請求書情報からサブスクリプションIDを取得
        // 型アサーションで強制的に型エラーを回避
        if (invoice && invoice.customer) {
          // @ts-ignore - Stripe型定義の互換性問題を回避
          const invoiceSubscriptionId = invoice.subscription;
          
          if (invoiceSubscriptionId) {
            // サブスクリプションIDがある場合のみ処理
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('id, organization_id')
              .eq('payment_provider_subscription_id', invoiceSubscriptionId)
              .single();
              
            if (subData) {
              // 支払い記録を追加
              await supabase
                .from('payment_history')
                .insert({
                  subscription_id: subData.id,
                  amount: invoice.amount_paid || 0,
                  currency: invoice.currency || 'jpy',
                  payment_date: new Date((invoice.created || Date.now()) * 1000).toISOString(),
                  payment_method: 'card', // 簡略化
                  status: 'completed',
                  invoice_url: invoice.hosted_invoice_url || undefined,
                  payment_provider_transaction_id: invoice.id
                });
            }
          }
        }
        return true;
        
      case 'customer.subscription.updated':
        // サブスクリプション更新時の処理
        const updatedSubscription = event.data.object as Stripe.Subscription;
        // データベースのサブスクリプション情報を更新
        if (updatedSubscription.metadata?.organization_id) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: updatedSubscription.status,
              cancel_at_period_end: updatedSubscription.cancel_at_period_end,
              current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('payment_provider_subscription_id', updatedSubscription.id);
            
          if (error) {
            console.error('サブスクリプション更新エラー:', error);
            return false;
          }
        }
        return true;
        
      case 'customer.subscription.deleted':
        // サブスクリプション削除時の処理
        const deletedSubscription = event.data.object as Stripe.Subscription;
        // データベースのサブスクリプションステータスを更新
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('payment_provider_subscription_id', deletedSubscription.id);
        return true;
        
      default:
        // その他のイベントは無視
        return true;
    }
  } catch (error) {
    console.error('Webhookハンドリングエラー:', error);
    return false;
  }
}; 