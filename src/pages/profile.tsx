import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import UserProfile from '@/components/user/UserProfile';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Layout>
        <UserProfile />
      </Layout>
    </AuthGuard>
  );
} 