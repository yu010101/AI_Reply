import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { LocationManagement } from '@/components/location/LocationManagement';

export default function LocationsPage() {
  return (
    <AuthGuard>
      <Layout>
        <LocationManagement />
      </Layout>
    </AuthGuard>
  );
} 