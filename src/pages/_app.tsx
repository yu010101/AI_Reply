import '../styles/globals.css';
import { AppProps } from 'next/app';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';
import theme from '@/theme/muiTheme';

function MyApp({ Component, pageProps, router }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ToastProvider>
          <AnimatePresence mode="wait" initial={false}>
            <Component {...pageProps} key={router.pathname} />
          </AnimatePresence>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp;
