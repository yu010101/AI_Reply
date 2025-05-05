import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Link } from '@mui/material';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('[LoginForm] ログイン試行:', email);
      console.log('[LoginForm] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[LoginForm] ログインエラー:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else {
          setError(`ログインエラー: ${error.message}`);
        }
        return;
      }

      if (!data.user) {
        console.error('[LoginForm] ユーザーデータが取得できません');
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      console.log('[LoginForm] ログイン成功:', data.user.email);
      router.push('/tenants');
    } catch (error) {
      console.error('[LoginForm] 予期せぬエラー:', error);
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 8,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        ログイン
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TextField
        label="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        disabled={loading}
      />

      <TextField
        label="パスワード"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={loading}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? 'ログイン中...' : 'ログイン'}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Link
          href="/auth/reset-password"
          variant="body2"
        >
          パスワードを忘れた場合
        </Link>
        <Link
          href="/auth/register"
          variant="body2"
        >
          新規登録はこちら
        </Link>
      </Box>
    </Box>
  );
} 