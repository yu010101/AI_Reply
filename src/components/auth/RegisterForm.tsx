import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Link } from '@mui/material';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!isValidEmail(email)) {
      setError('有効なメールアドレスを入力してください');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    try {
      console.log('[RegisterForm] ユーザー登録試行:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        console.error('[RegisterForm] 登録エラー:', error);
        if (error.message.includes('already registered')) {
          setError('このメールアドレスは既に登録されています');
        } else {
          setError(`登録エラー: ${error.message}`);
        }
        return;
      }

      if (!data.user) {
        console.error('[RegisterForm] ユーザーデータが取得できません');
        setError('ユーザー登録に失敗しました');
        return;
      }

      console.log('[RegisterForm] 登録成功:', data.user.email);
      setSuccess(true);
      
      // メール確認メッセージを表示
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (error) {
      console.error('[RegisterForm] 予期せぬエラー:', error);
      setError('登録処理中にエラーが発生しました');
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
        新規登録
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success">
          登録が完了しました。確認メールを送信しましたので、メール内のリンクからアカウントを有効化してください。
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
        error={!!error && !isValidEmail(email)}
        helperText={!isValidEmail(email) ? '有効なメールアドレスを入力してください' : ''}
      />

      <TextField
        label="パスワード"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={loading}
        helperText="6文字以上の英数字で入力してください"
      />

      <TextField
        label="パスワード（確認）"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? '登録中...' : '登録'}
      </Button>

      <Link
        href="/auth/login"
        variant="body2"
        sx={{ mt: 2, textAlign: 'center' }}
      >
        すでにアカウントをお持ちの方はこちら
      </Link>
    </Box>
  );
} 