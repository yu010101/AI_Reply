import { Router } from 'express';
import { authenticate } from '../middleware/security';
import { StripeService } from '../payment/stripe';
import { db } from '../db';

const router = Router();

// サブスクリプション情報の取得
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM subscriptions WHERE tenant_id = $1',
      [req.user!.tenantId]
    );
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'サブスクリプション情報の取得に失敗しました' });
  }
});

// サブスクリプションの作成
router.post('/', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const tenant = await db.query('SELECT * FROM tenants WHERE id = $1', [req.user!.tenantId]);
    
    if (!tenant.rows[0]) {
      throw new Error('テナントが見つかりません');
    }

    const customer = await StripeService.createCustomer(
      tenant.rows[0].email,
      tenant.rows[0].name
    );

    const subscription = await StripeService.createSubscription(
      customer.id,
      process.env.STRIPE_PRICE_ID!
    );

    await db.query(
      'INSERT INTO subscriptions (tenant_id, stripe_customer_id, stripe_subscription_id, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user!.tenantId, customer.id, subscription.id, plan, subscription.status]
    );

    res.status(201).json({ data: subscription });
  } catch (error) {
    res.status(400).json({ error: 'サブスクリプションの作成に失敗しました' });
  }
});

// サブスクリプションの更新
router.put('/', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE tenant_id = $1',
      [req.user!.tenantId]
    );

    if (!subscription.rows[0]) {
      throw new Error('サブスクリプションが見つかりません');
    }

    const updatedSubscription = await StripeService.updateSubscription(
      subscription.rows[0].stripe_subscription_id,
      process.env.STRIPE_PRICE_ID!
    );

    await db.query(
      'UPDATE subscriptions SET plan = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $3 RETURNING *',
      [plan, updatedSubscription.status, req.user!.tenantId]
    );

    res.json({ data: updatedSubscription });
  } catch (error) {
    res.status(400).json({ error: 'サブスクリプションの更新に失敗しました' });
  }
});

// サブスクリプションのキャンセル
router.delete('/', authenticate, async (req, res) => {
  try {
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE tenant_id = $1',
      [req.user!.tenantId]
    );

    if (!subscription.rows[0]) {
      throw new Error('サブスクリプションが見つかりません');
    }

    await StripeService.cancelSubscription(subscription.rows[0].stripe_subscription_id);

    await db.query(
      'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2',
      ['canceled', req.user!.tenantId]
    );

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'サブスクリプションのキャンセルに失敗しました' });
  }
});

export default router; 