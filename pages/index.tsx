import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);
  return null;
}
