import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import ReplyTemplateManager from '@/components/reply/ReplyTemplateManager';

export default function ReplyTemplatesPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReplyTemplateManager />
      </Layout>
    </AuthGuard>
  );
} 