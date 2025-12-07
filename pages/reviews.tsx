import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import ReviewManagementUltimate from '@/components/review/ReviewManagementUltimate';

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReviewManagementUltimate />
      </Layout>
    </AuthGuard>
  );
} 