import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Typography, Button, Paper, Grid } from '@mui/material';
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
        <Box sx={{ p: 3, bgcolor: '#FFFFFF', minHeight: '100vh' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#1F2937', fontWeight: 600 }}>
              テナント一覧
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/tenants/new')}
              sx={{
                bgcolor: '#2563EB',
                '&:hover': {
                  bgcolor: '#1E40AF',
                },
              }}
            >
              新規作成
            </Button>
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2, color: '#EF4444' }}>
              {error}
            </Typography>
          )}

          {loading ? (
            <Typography sx={{ color: '#1F2937' }}>読み込み中...</Typography>
          ) : tenants.length > 0 ? (
            <Grid container spacing={2}>
              {tenants.map((tenant) => (
                <Grid item xs={12} sm={6} md={4} key={tenant.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      },
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#1F2937', fontWeight: 600, mb: 1 }}>
                        {tenant.name}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', mb: 1 }}>
                        メールアドレス: {tenant.email}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', mb: 1 }}>
                        プラン: {tenant.plan}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', mb: 1 }}>
                        ステータス: {tenant.status}
                      </Typography>
                      <Typography sx={{ color: '#4B5563' }}>
                        作成日: {new Date(tenant.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                      sx={{
                        color: '#2563EB',
                        borderColor: '#2563EB',
                        '&:hover': {
                          borderColor: '#1E40AF',
                          bgcolor: '#F3F4F6',
                        },
                      }}
                    >
                      詳細
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: '#1F2937' }}>テナントがありません</Typography>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 