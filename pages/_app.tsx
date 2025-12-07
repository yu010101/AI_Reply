import '../styles/globals.css';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { CookieConsent } from '@/components/legal/CookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}

export default MyApp;
