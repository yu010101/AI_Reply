import { useRouter } from 'next/router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import UserRoleManagement from '@/components/user/UserRoleManagement';
import UserInvitation from '@/components/user/UserInvitation';
import { Box, Typography } from '@mui/material';

export default function TenantUsersPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return null;
  }

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            ユーザー管理
          </Typography>
          <UserInvitation tenantId={id as string} />
          <UserRoleManagement tenantId={id as string} />
        </Box>
      </Layout>
    </AuthGuard>
  );
} 