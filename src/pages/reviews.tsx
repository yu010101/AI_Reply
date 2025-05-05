import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { ReviewManagement } from '@/components/review/ReviewManagement';

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReviewManagement />
      </Layout>
    </AuthGuard>
  );
} 