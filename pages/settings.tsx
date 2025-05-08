import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Tabs, Tab, Typography, Alert } from '@mui/material';
import GoogleBusinessIntegration from '@/components/settings/GoogleBusinessIntegration';
import NotificationSettings from '@/components/notification/NotificationSettings';
import SubscriptionSettings from '@/components/subscription/SubscriptionSettings';
import { useRouter } from 'next/router';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { tab, success, cancelled } = router.query;
  const [tabValue, setTabValue] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // URLパラメータからタブを設定
  useEffect(() => {
    if (tab) {
      const tabIndex = parseInt(tab as string, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 2) {
        setTabValue(tabIndex);
      }
    }
  }, [tab]);

  // サブスクリプションのステータスメッセージを設定
  useEffect(() => {
    if (success === 'true') {
      setStatusMessage({
        type: 'success',
        message: 'サブスクリプションの変更が完了しました。'
      });
      // クエリパラメータをクリア
      router.replace('/settings?tab=2', undefined, { shallow: true });
    } else if (cancelled === 'true') {
      setStatusMessage({
        type: 'info',
        message: 'サブスクリプションの変更がキャンセルされました。'
      });
      // クエリパラメータをクリア
      router.replace('/settings?tab=2', undefined, { shallow: true });
    }
  }, [success, cancelled, router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // タブ変更時にURLを更新
    router.push(`/settings?tab=${newValue}`, undefined, { shallow: true });
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            設定
          </Typography>
          
          {statusMessage && (
            <Alert 
              severity={statusMessage.type} 
              sx={{ mb: 3 }}
              onClose={() => setStatusMessage(null)}
            >
              {statusMessage.message}
            </Alert>
          )}
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="設定タブ">
              <Tab label="Google Business Profile連携" />
              <Tab label="通知設定" />
              <Tab label="サブスクリプション管理" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <GoogleBusinessIntegration />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <NotificationSettings />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <SubscriptionSettings />
          </TabPanel>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 