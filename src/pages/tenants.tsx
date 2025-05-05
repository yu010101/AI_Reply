import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Typography, Button, Card, CardContent, CardActions } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

type Tenant = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function TenantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTenants(data || []);
    } catch (error) {
      console.error('テナント取得エラー:', error);
      setError('テナント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">
              テナント一覧
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/tenants/new')}
            >
              新規作成
            </Button>
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {loading ? (
            <Typography>読み込み中...</Typography>
          ) : tenants.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {tenants.map((tenant) => (
                <Card key={tenant.id}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {tenant.name}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      メールアドレス: {tenant.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      プラン: {tenant.plan}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ステータス: {tenant.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      作成日: {new Date(tenant.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                    >
                      詳細
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography>テナントがありません</Typography>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 