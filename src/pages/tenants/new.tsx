import { useRouter } from 'next/router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Typography, Button, Card, CardContent, TextField, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { useState } from 'react';

type CreateTenantRequest = {
  name: string;
  description: string;
};

export default function NewTenantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newTenant, setNewTenant] = useState<CreateTenantRequest>({
    name: '',
    description: '',
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { data, error } = await supabase
        .from('tenants')
        .insert([newTenant])
        .select()
        .single();

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/tenants');
      }, 2000);
    } catch (error) {
      console.error('テナント作成エラー:', error);
      setError('テナントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            新規テナント作成
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              テナントを作成しました。テナント一覧に戻ります...
            </Alert>
          )}

          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleCreateTenant}>
                <TextField
                  fullWidth
                  label="テナント名"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="説明"
                  value={newTenant.description}
                  onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                  multiline
                  rows={4}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  作成
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 