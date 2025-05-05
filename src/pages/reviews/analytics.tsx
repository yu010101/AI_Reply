import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import ReviewAnalytics from '@/components/analytics/ReviewAnalytics';

export default function ReviewAnalyticsPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReviewAnalytics />
      </Layout>
    </AuthGuard>
  );
} 