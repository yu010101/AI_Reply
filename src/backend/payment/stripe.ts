import Stripe from 'stripe';
import { db } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as const,
});

export class StripeService {
  static async createCustomer(email: string, name: string) {
    return await stripe.customers.create({
      email,
      name,
    });
  }

  static async createSubscription(customerId: string, priceId: string) {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  static async updateSubscription(subscriptionId: string, priceId: string) {
    return await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: priceId }],
    });
  }

  static async cancelSubscription(subscriptionId: string) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  static async handleWebhook(signature: string, payload: Buffer) {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeletion(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private static async handleSubscriptionChange(subscription: Stripe.Subscription) {
    await db.query(
      'UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3 WHERE stripe_subscription_id = $4',
      [
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.id,
      ]
    );
  }

  private static async handleSubscriptionDeletion(subscription: Stripe.Subscription) {
    await db.query(
      'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
      ['canceled', subscription.id]
    );
  }
} 