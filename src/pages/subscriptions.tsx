import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';

export default function SubscriptionsPage() {
  return (
    <AuthGuard>
      <Layout>
        <SubscriptionManagement />
      </Layout>
    </AuthGuard>
  );
} 