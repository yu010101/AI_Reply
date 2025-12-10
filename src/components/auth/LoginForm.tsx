/**
 * World-Class Login Form
 *
 * Design Principles:
 * - Crystal-clear user journey
 * - Accessible form with proper labels
 * - Smooth loading states
 * - Helpful error messaging
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('メールアドレスまたはパスワードが正しくありません');
          } else if (error.message.includes('Email not confirmed')) {
            setError('メールアドレスの確認が完了していません。確認メールをご確認ください');
          } else {
            setError('ログインに失敗しました。しばらく経ってからお試しください');
          }
          return;
        }

        if (!data.user) {
          setError('ユーザー情報の取得に失敗しました');
          return;
        }

        router.push('/dashboard');
      } catch {
        setError('ログイン処理中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontWeight: 500,
            },
          }}
        >
          {error}
        </Alert>
      )}

      {/* Email Field */}
      <Box>
        <Typography
          component="label"
          htmlFor="email"
          sx={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'text.secondary',
            mb: 1,
          }}
        >
          メールアドレス
        </Typography>
        <TextField
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          disabled={loading}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
            },
          }}
        />
      </Box>

      {/* Password Field */}
      <Box>
        <Typography
          component="label"
          htmlFor="password"
          sx={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'text.secondary',
            mb: 1,
          }}
        >
          パスワード
        </Typography>
        <TextField
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          disabled={loading}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  onClick={togglePasswordVisibility}
                  edge="end"
                  size="small"
                  sx={{
                    '&:focus-visible': {
                      boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                    },
                  }}
                >
                  {showPassword ? (
                    <VisibilityOff sx={{ fontSize: 20 }} />
                  ) : (
                    <Visibility sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
            },
          }}
        />
      </Box>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        disabled={loading || !email || !password}
        fullWidth
        sx={{
          mt: 1,
          py: 1.5,
          borderRadius: 1.5,
          fontSize: '0.9375rem',
          fontWeight: 500,
          position: 'relative',
        }}
      >
        {loading ? (
          <>
            <CircularProgress
              size={20}
              sx={{
                color: 'inherit',
                position: 'absolute',
                left: '50%',
                marginLeft: '-10px',
              }}
            />
            <span style={{ visibility: 'hidden' }}>ログイン</span>
          </>
        ) : (
          'ログイン'
        )}
      </Button>

      {/* Links */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Link
          href="/auth/reset-password"
          style={{
            fontSize: '0.875rem',
            color: '#475569',
            textDecoration: 'none',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.875rem',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                textDecoration: 'underline',
              },
              transition: 'color 150ms ease',
            }}
          >
            パスワードを忘れた場合
          </Typography>
        </Link>
        <Link
          href="/auth/register"
          style={{
            fontSize: '0.875rem',
            color: '#0F172A',
            textDecoration: 'none',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.875rem',
              color: 'text.primary',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            新規登録
          </Typography>
        </Link>
      </Box>
    </Box>
  );
}
