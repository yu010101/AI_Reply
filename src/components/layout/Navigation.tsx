/**
 * World-Class Navigation Component
 *
 * Design Principles:
 * - Crystal-clear navigation hierarchy
 * - Keyboard-accessible with focus management
 * - Smooth transitions
 * - Mobile-first responsive design
 */

import { useState, useCallback } from 'react';
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
  Collapse,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
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
  ContactSupport as ContactSupportIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const DRAWER_WIDTH = 256;

interface NavigationProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: { label: string; path: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  {
    label: 'ダッシュボード',
    path: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    label: '店舗管理',
    path: '/locations',
    icon: <StoreIcon />,
  },
  {
    label: 'レビュー管理',
    icon: <CommentIcon />,
    children: [
      { label: 'レビュー一覧', path: '/reviews', icon: <ListIcon /> },
      { label: 'レビュー分析', path: '/reviews/analytics', icon: <BarChartIcon /> },
    ],
  },
  {
    label: 'AI返信',
    icon: <AutoAwesomeIcon />,
    children: [
      { label: '返信テンプレート', path: '/reply-templates', icon: <ListIcon /> },
      { label: '返信分析', path: '/ai-reply-analytics', icon: <AnalyticsIcon /> },
    ],
  },
  {
    label: '請求・プラン',
    icon: <PaymentIcon />,
    children: [
      { label: 'プラン管理', path: '/account/billing', icon: <PaymentIcon /> },
      { label: '請求履歴', path: '/subscription-history', icon: <ListIcon /> },
    ],
  },
  {
    label: '設定',
    path: '/settings',
    icon: <SettingsIcon />,
  },
  {
    label: 'お問い合わせ',
    path: '/contact',
    icon: <ContactSupportIcon />,
  },
];

export default function Navigation({ mobileOpen, handleDrawerToggle }: NavigationProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }, [signOut, router]);

  const toggleMenu = useCallback((label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const isPathActive = useCallback(
    (path: string) => {
      if (path === router.pathname) return true;
      // Check if current path starts with the nav path (for nested routes)
      if (path !== '/' && router.pathname.startsWith(path)) return true;
      return false;
    },
    [router.pathname]
  );

  const isMenuActive = useCallback(
    (item: NavItem) => {
      if (item.path) return isPathActive(item.path);
      if (item.children) {
        return item.children.some((child) => isPathActive(child.path));
      }
      return false;
    },
    [isPathActive]
  );

  const handleNavigation = useCallback(
    (path: string) => {
      router.push(path);
      if (mobileOpen) handleDrawerToggle();
    },
    [router, mobileOpen, handleDrawerToggle]
  );

  const drawer = (
    <Box
      component="nav"
      aria-label="メインナビゲーション"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          RevAI Concierge
        </Typography>
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <List component="ul" sx={{ px: 1.5 }} disablePadding>
          {navItems.map((item) => (
            <ListItem key={item.label} disablePadding component="li" sx={{ display: 'block', mb: 0.5 }}>
              {item.children ? (
                <>
                  <ListItemButton
                    onClick={() => toggleMenu(item.label)}
                    aria-expanded={openMenus[item.label] || isMenuActive(item)}
                    aria-controls={`${item.label}-submenu`}
                    sx={{
                      borderRadius: 1.5,
                      py: 1.25,
                      px: 2,
                      minHeight: 44,
                      color: isMenuActive(item) ? 'text.primary' : 'text.secondary',
                      bgcolor: isMenuActive(item) ? 'action.hover' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                      },
                      '&:focus-visible': {
                        outline: 'none',
                        boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                      },
                      transition: 'all 150ms ease',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isMenuActive(item) ? 500 : 400,
                      }}
                    />
                    {openMenus[item.label] || isMenuActive(item) ? (
                      <ExpandLess sx={{ fontSize: 20 }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 20 }} />
                    )}
                  </ListItemButton>
                  <Collapse
                    in={openMenus[item.label] || isMenuActive(item)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List
                      component="ul"
                      id={`${item.label}-submenu`}
                      disablePadding
                      sx={{ pl: 2, mt: 0.5 }}
                    >
                      {item.children.map((child) => (
                        <ListItem key={child.path} disablePadding component="li" sx={{ mb: 0.5 }}>
                          <ListItemButton
                            selected={isPathActive(child.path)}
                            onClick={() => handleNavigation(child.path)}
                            sx={{
                              borderRadius: 1.5,
                              py: 1,
                              px: 2,
                              minHeight: 40,
                              color: isPathActive(child.path) ? 'text.primary' : 'text.secondary',
                              bgcolor: isPathActive(child.path)
                                ? (theme) => alpha(theme.palette.text.primary, 0.08)
                                : 'transparent',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                color: 'text.primary',
                              },
                              '&:focus-visible': {
                                outline: 'none',
                                boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                              },
                              '&.Mui-selected': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.12),
                                },
                              },
                              transition: 'all 150ms ease',
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                color: 'inherit',
                                '& svg': { fontSize: 18 },
                              }}
                            >
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{
                                fontSize: '0.8125rem',
                                fontWeight: isPathActive(child.path) ? 500 : 400,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItemButton
                  selected={isPathActive(item.path!)}
                  onClick={() => handleNavigation(item.path!)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.25,
                    px: 2,
                    minHeight: 44,
                    color: isPathActive(item.path!) ? 'text.primary' : 'text.secondary',
                    bgcolor: isPathActive(item.path!)
                      ? (theme) => alpha(theme.palette.text.primary, 0.08)
                      : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                    },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                    },
                    '&.Mui-selected': {
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.12),
                      },
                    },
                    transition: 'all 150ms ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isPathActive(item.path!) ? 500 : 400,
                    }}
                  />
                </ListItemButton>
              )}
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1.5 }}>
        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleSignOut}
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                px: 2,
                minHeight: 44,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'error.contrastText',
                  },
                },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                },
                transition: 'all 150ms ease',
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: 'inherit',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="ログアウト"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box
      component="aside"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
