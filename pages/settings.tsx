import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import GoogleBusinessIntegration from '@/components/settings/GoogleBusinessIntegration';
import NotificationSettings from '@/components/notification/NotificationSettings';

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
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            設定
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="設定タブ">
              <Tab label="Google Business Profile連携" />
              <Tab label="通知設定" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <GoogleBusinessIntegration />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <NotificationSettings />
          </TabPanel>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 