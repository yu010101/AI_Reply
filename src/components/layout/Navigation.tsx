import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Store as StoreIcon,
  Comment as CommentIcon,
  BarChart as BarChartIcon,
  Payment as PaymentIcon,
  AutoAwesome as AutoAwesomeIcon,
  ExpandLess,
  ExpandMore,
  FormatListBulleted as ListIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const drawerWidth = 240;

export default function Navigation() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const isPathActive = (path: string) => {
    if (path === router.pathname) return true;
    if (path === '/reviews' && router.pathname.startsWith('/reviews')) return true;
    if (path === '/ai-reply' && router.pathname.startsWith('/ai-reply')) return true;
    if (path === '/account' && router.pathname.startsWith('/account')) return true;
    return false;
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">RevAI Concierge</Typography>
      </Box>
      <Divider />
      <List>
        {/* ダッシュボード */}
        <ListItem disablePadding>
          <ListItemButton
            selected={router.pathname === '/dashboard'}
            onClick={() => router.push('/dashboard')}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="ダッシュボード" />
          </ListItemButton>
        </ListItem>

        {/* 店舗管理 */}
        <ListItem disablePadding>
          <ListItemButton
            selected={router.pathname === '/locations'}
            onClick={() => router.push('/locations')}
          >
            <ListItemIcon><StoreIcon /></ListItemIcon>
            <ListItemText primary="店舗管理" />
          </ListItemButton>
        </ListItem>

        {/* レビュー管理 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setReviewsOpen(!reviewsOpen)}
          >
            <ListItemIcon><CommentIcon /></ListItemIcon>
            <ListItemText primary="レビュー管理" />
            {reviewsOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={reviewsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/reviews'}
              onClick={() => router.push('/reviews')}
            >
              <ListItemIcon><ListIcon /></ListItemIcon>
              <ListItemText primary="レビュー一覧" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/reviews/analytics'}
              onClick={() => router.push('/reviews/analytics')}
            >
              <ListItemIcon><BarChartIcon /></ListItemIcon>
              <ListItemText primary="レビュー分析" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* AI返信機能 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setAiOpen(!aiOpen)}
          >
            <ListItemIcon><AutoAwesomeIcon /></ListItemIcon>
            <ListItemText primary="AI返信" />
            {aiOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={aiOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/reply-templates'}
              onClick={() => router.push('/reply-templates')}
            >
              <ListItemIcon><ListIcon /></ListItemIcon>
              <ListItemText primary="返信テンプレート" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/ai-reply-analytics'}
              onClick={() => router.push('/ai-reply-analytics')}
            >
              <ListItemIcon><AnalyticsIcon /></ListItemIcon>
              <ListItemText primary="返信分析" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* 請求・プラン管理 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setBillingOpen(!billingOpen)}
          >
            <ListItemIcon><PaymentIcon /></ListItemIcon>
            <ListItemText primary="請求・プラン" />
            {billingOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={billingOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/account/billing'}
              onClick={() => router.push('/account/billing')}
            >
              <ListItemIcon><PaymentIcon /></ListItemIcon>
              <ListItemText primary="プラン管理" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              selected={router.pathname === '/subscription-history'}
              onClick={() => router.push('/subscription-history')}
            >
              <ListItemIcon><ListIcon /></ListItemIcon>
              <ListItemText primary="請求履歴" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* 設定 */}
        <ListItem disablePadding>
          <ListItemButton
            selected={router.pathname === '/settings'}
            onClick={() => router.push('/settings')}
          >
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary="設定" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="ログアウト" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{ mr: 2, display: { sm: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
} 