/**
 * World-Class Settings Page
 *
 * Design Principles:
 * - Clear tab navigation with visual feedback
 * - Accessible with proper ARIA attributes
 * - Consistent with design system
 * - Smooth transitions between tabs
 */

import { useState, useCallback, useMemo, SyntheticEvent } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleBusinessIntegration from '@/components/settings/GoogleBusinessIntegration';
import NotificationSettings from '@/components/notification/NotificationSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      <AnimatePresence mode="wait">
        {value === index && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ py: 3 }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const tabs = [
  {
    label: 'Google連携',
    icon: <LinkIcon sx={{ fontSize: 20 }} />,
    description: 'Google Business Profileとの連携設定',
  },
  {
    label: '通知設定',
    icon: <NotificationsIcon sx={{ fontSize: 20 }} />,
    description: '通知の受信設定',
  },
];

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = useCallback(
    (_event: SyntheticEvent, newValue: number) => {
      setTabValue(newValue);
    },
    []
  );

  const currentTab = useMemo(() => tabs[tabValue], [tabValue]);

  return (
    <AuthGuard>
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SettingsIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                >
                  設定
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                アプリケーションの設定を管理します
              </Typography>
            </Box>
          </motion.div>

          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label="設定タブ"
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    px: 2,
                    '& .MuiTabs-indicator': {
                      height: 2,
                      borderRadius: 1,
                    },
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.9375rem',
                      minHeight: 56,
                      py: 2,
                      px: 3,
                      gap: 1,
                      '&:focus-visible': {
                        boxShadow: 'inset 0 0 0 2px currentColor',
                        borderRadius: 1,
                      },
                    },
                  }}
                >
                  {tabs.map((tab, index) => (
                    <Tab
                      key={index}
                      icon={tab.icon}
                      iconPosition="start"
                      label={tab.label}
                      {...a11yProps(index)}
                    />
                  ))}
                </Tabs>
              </Box>

              {/* Tab Content */}
              <Box sx={{ p: 3, minHeight: 400 }}>
                {/* Tab Description */}
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  {currentTab.description}
                </Typography>

                <TabPanel value={tabValue} index={0}>
                  <GoogleBusinessIntegration />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <NotificationSettings />
                </TabPanel>
              </Box>
            </Paper>
          </motion.div>
        </Container>
      </Layout>
    </AuthGuard>
  );
}
