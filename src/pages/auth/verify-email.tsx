import { useEffect, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('[VerifyEmail] メール確認処理開始');
        
        const { error } = await supabase.auth.verifyOtp({
          token_hash: router.query.token_hash as string,
          type: 'email',
        });

        if (error) {
          console.error('[VerifyEmail] 確認エラー:', error);
          setError('メールアドレスの確認に失敗しました');
          setStatus('error');
          return;
        }

        console.log('[VerifyEmail] メール確認成功');
        setStatus('success');
        
        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } catch (error) {
        console.error('[VerifyEmail] 予期せぬエラー:', error);
        setError('予期せぬエラーが発生しました');
        setStatus('error');
      }
    };

    if (router.query.token_hash) {
      verifyEmail();
    }
  }, [router]);

  return (
    <Box
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 8,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center',
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress />
          <Typography>メールアドレスを確認中...</Typography>
        </>
      )}

      {status === 'success' && (
        <Alert severity="success">
          メールアドレスの確認が完了しました。ログインページに移動します。
        </Alert>
      )}

      {status === 'error' && (
        <Alert severity="error">
          {error || 'メールアドレスの確認に失敗しました'}
        </Alert>
      )}
    </Box>
  );
} 