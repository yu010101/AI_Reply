import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
// import { SettingsManagement } from '@/components/settings/SettingsManagement';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Layout>
        {/* <SettingsManagement /> */}
        <div className="p-8 text-center text-gray-500">設定管理ページ（今後実装）</div>
      </Layout>
    </AuthGuard>
  );
} 