import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Card, CardContent, Typography, Button, Grid, Alert } from '@mui/material';
import { createCustomerPortalSession } from '@/utils/stripe';

interface UsageMetric {
  type: string;
  total: number;
}

export default function BillingPage() {
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageMetrics();
  }, []);

  const fetchUsageMetrics = async () => {
    try {
      const response = await fetch('/api/usage-metrics');
      if (!response.ok) {
        throw new Error('使用量データの取得に失敗しました');
      }
      const data = await response.json();
      setUsageMetrics(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const handleManageBilling = async () => {
    try {
      await createCustomerPortalSession();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            請求と使用状況
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    使用状況
                  </Typography>
                  {usageMetrics.map((metric) => (
                    <Box key={metric.type} sx={{ mb: 1 }}>
                      <Typography variant="body1">
                        {metric.type === 'review' ? 'レビュー数' : 'AI返信数'}: {metric.total}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    請求管理
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleManageBilling}
                    fullWidth
                  >
                    請求ポータルを開く
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 