import { useRouter } from 'next/router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase';
import { useState, useEffect } from 'react';

type Tenant = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTenant();
    }
  }, [id]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setTenant(data);
    } catch (error) {
      console.error('テナント取得エラー:', error);
      setError('テナント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return null;
  }

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">
              テナント詳細
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push(`/tenants/${id}/users`)}
            >
              ユーザー管理
            </Button>
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {loading ? (
            <Typography>読み込み中...</Typography>
          ) : tenant ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {tenant.name}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  {tenant.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  作成日: {new Date(tenant.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Typography>テナントが見つかりません</Typography>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 