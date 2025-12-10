/**
 * World-Class Register Form
 *
 * Design Principles:
 * - Crystal-clear user journey
 * - Real-time validation feedback
 * - Accessible form with proper labels
 * - Password strength indicator
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
  CheckCircleOutline,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 20, label: '弱い', color: '#EF4444' };
  if (score <= 2) return { score: 40, label: 'やや弱い', color: '#F59E0B' };
  if (score <= 3) return { score: 60, label: '普通', color: '#FBBF24' };
  if (score <= 4) return { score: 80, label: '強い', color: '#10B981' };
  return { score: 100, label: 'とても強い', color: '#059669' };
};

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (!isValidEmail(email)) {
        setError('有効なメールアドレスを入力してください');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('パスワードは6文字以上で入力してください');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('パスワードが一致しません');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/verify-email`,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            setError('このメールアドレスは既に登録されています');
          } else {
            setError('登録に失敗しました。しばらく経ってからお試しください');
          }
          return;
        }

        if (!data.user) {
          setError('ユーザー登録に失敗しました');
          return;
        }

        setSuccess(true);

        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } catch {
        setError('登録処理中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirmPassword, router]
  );

  const isFormValid =
    isValidEmail(email) && password.length >= 6 && password === confirmPassword;

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

      {/* Success Alert */}
      {success && (
        <Alert
          severity="success"
          icon={<CheckCircleOutline />}
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontWeight: 500,
            },
          }}
        >
          登録が完了しました。確認メールを送信しましたので、メール内のリンクからアカウントを有効化してください。
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
          disabled={loading || success}
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
          disabled={loading || success}
          placeholder="6文字以上"
          autoComplete="new-password"
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
                  onClick={() => setShowPassword(!showPassword)}
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
        {/* Password Strength Indicator */}
        {password.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={passwordStrength.score}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  backgroundColor: passwordStrength.color,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                color: passwordStrength.color,
                fontWeight: 500,
              }}
            >
              パスワード強度: {passwordStrength.label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Confirm Password Field */}
      <Box>
        <Typography
          component="label"
          htmlFor="confirmPassword"
          sx={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'text.secondary',
            mb: 1,
          }}
        >
          パスワード（確認）
        </Typography>
        <TextField
          id="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          fullWidth
          disabled={loading || success}
          autoComplete="new-password"
          error={confirmPassword.length > 0 && !passwordsMatch}
          helperText={
            confirmPassword.length > 0 && !passwordsMatch
              ? 'パスワードが一致しません'
              : ''
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {passwordsMatch ? (
                  <CheckCircleOutline sx={{ color: 'success.main', fontSize: 20 }} />
                ) : (
                  <IconButton
                    aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                    sx={{
                      '&:focus-visible': {
                        boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                      },
                    }}
                  >
                    {showConfirmPassword ? (
                      <VisibilityOff sx={{ fontSize: 20 }} />
                    ) : (
                      <Visibility sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                )}
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
        disabled={loading || !isFormValid || success}
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
            <span style={{ visibility: 'hidden' }}>登録する</span>
          </>
        ) : (
          '登録する'
        )}
      </Button>

      {/* Login Link */}
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: 'text.secondary',
          textAlign: 'center',
          mt: 1,
        }}
      >
        すでにアカウントをお持ちの方は{' '}
        <Link
          href="/auth/login"
          style={{
            color: '#0F172A',
            textDecoration: 'none',
          }}
        >
          <Typography
            component="span"
            sx={{
              color: 'text.primary',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            ログイン
          </Typography>
        </Link>
      </Typography>
    </Box>
  );
}
