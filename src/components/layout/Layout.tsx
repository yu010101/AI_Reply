import { Box, Container } from '@mui/material';
import Navigation from './Navigation';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      <Navigation />
      <Container component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#fff' }}>
        {children}
      </Container>
    </Box>
  );
} 