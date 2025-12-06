import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { supabase } from '@/utils/supabase';

export default function NewPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // パスワードリセットセッションを確認
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[NewPassword] セッションが見つかりません');
        router.push('/auth/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    try {
      console.log('[NewPassword] パスワード更新開始');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('[NewPassword] パスワード更新エラー:', error);
        throw error;
      }

      console.log('[NewPassword] パスワード更新成功');
      navigate('/auth/login');
    } catch (error) {
      console.error('[NewPassword] 予期せぬエラー:', error);
      setError('パスワードの更新に失敗しました');
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
        新しいパスワードを設定
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TextField
        label="新しいパスワード"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        disabled={loading}
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
        {loading ? '更新中...' : 'パスワードを更新'}
      </Button>
    </Box>
  );
} 