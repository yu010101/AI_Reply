import { Box, Container, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Navigation from './Navigation';
import { useState } from 'react';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, display: { sm: 'none' } }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="メニューを開く"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            RevAI Concierge
          </Typography>
        </Toolbar>
      </AppBar>
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Container component="main" sx={{ 
        flexGrow: 1, 
        p: 3, 
        bgcolor: '#fff',
        mt: { xs: 8, sm: 0 } // モバイルビューの場合にはAppBarの高さ分下げる
      }}>
        {children}
      </Container>
    </Box>
  );
} 