import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { supabase } from '@/utils/supabase';

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('[PasswordReset] パスワードリセットリクエスト開始:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('[PasswordReset] パスワードリセットエラー:', error);
        throw error;
      }

      console.log('[PasswordReset] パスワードリセットメール送信成功');
      setSuccess(true);
    } catch (error) {
      console.error('[PasswordReset] 予期せぬエラー:', error);
      setError('パスワードリセットに失敗しました');
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
        パスワードリセット
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success">
          パスワードリセット用のメールを送信しました。メールに記載されたリンクからパスワードを再設定してください。
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

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? '送信中...' : 'リセットメールを送信'}
      </Button>
    </Box>
  );
} 