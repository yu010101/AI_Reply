import '../styles/globals.css';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const BrowserRouter = dynamic(
  () => import('react-router-dom').then((mod) => mod.BrowserRouter),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Component {...pageProps} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default MyApp;
