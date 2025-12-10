import LoginForm from '@/components/auth/LoginForm';
import { Box, Container, Typography } from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>ログイン - RevAI Concierge</title>
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#FFFFFF',
        }}
      >
        {/* Header */}
        <Box
          component="header"
          sx={{
            py: 3,
            px: 4,
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 400,
                color: '#1A1A1A',
              }}
            >
              RevAI Concierge
            </Typography>
          </Link>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Container maxWidth="sm">
            <Box
              sx={{
                maxWidth: 400,
                mx: 'auto',
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: '1.75rem',
                  fontWeight: 400,
                  color: '#1A1A1A',
                  mb: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                ログイン
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  mb: 4,
                }}
              >
                アカウントにログインしてください
              </Typography>
              <LoginForm />
            </Box>
          </Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 4,
            borderTop: '1px solid #E5E7EB',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
            © 2024 RevAI Concierge
          </Typography>
        </Box>
      </Box>
    </>
  );
}
