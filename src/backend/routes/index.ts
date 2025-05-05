import { Router } from 'express';
import authRoutes from '../api/auth';
import tenantRoutes from '../api/tenants';
import subscriptionRoutes from '../api/subscriptions';

const router = Router();

// APIルート
router.use('/api/auth', authRoutes);
router.use('/api/tenants', tenantRoutes);
router.use('/api/subscriptions', subscriptionRoutes);

export default router; 