/**
 * World-Class User Profile Component
 *
 * Design Principles:
 * - Clear, focused form design
 * - Visual feedback for all actions
 * - Accessible with proper labels
 * - Smooth loading states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  Paper,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function UserProfile() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName((user as any).user_metadata?.name || '');
      setAvatarUrl((user as any).user_metadata?.avatar_url || '');
    }
  }, [user]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const { error } = await supabase.auth.updateUser({
          data: { name },
        });

        if (error) throw error;

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        console.error('プロフィール更新エラー:', error);
        setError('プロフィールの更新に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [name]
  );

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingAvatar(true);
        setError(null);

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(filePath);

        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

        if (updateError) throw updateError;

        setAvatarUrl(publicUrl);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        console.error('アバター更新エラー:', error);
        setError('アバターの更新に失敗しました');
      } finally {
        setUploadingAvatar(false);
      }
    },
    [user?.id]
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 500,
              letterSpacing: '-0.02em',
              mb: 1,
            }}
          >
            プロフィール設定
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アカウント情報を管理します
          </Typography>
        </Box>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {/* Alerts */}
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{
                borderRadius: 0,
                '& .MuiAlert-message': { fontWeight: 500 },
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon />}
              sx={{
                borderRadius: 0,
                '& .MuiAlert-message': { fontWeight: 500 },
              }}
            >
              プロフィールを更新しました
            </Alert>
          )}

          {/* Avatar Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 5,
              px: 3,
              bgcolor: 'background.default',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Avatar
                src={avatarUrl}
                alt={name}
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: '2.5rem',
                  fontWeight: 500,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                {getInitials(name || user?.email || '?')}
              </Avatar>
              {uploadingAvatar && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '50%',
                  }}
                >
                  <CircularProgress size={32} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
            <Button
              variant="outlined"
              component="label"
              disabled={uploadingAvatar}
              startIcon={<PhotoCameraOutlinedIcon />}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                '&:focus-visible': {
                  boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                },
              }}
            >
              {uploadingAvatar ? 'アップロード中...' : 'アバターを変更'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </Button>
          </Box>

          {/* Form Section */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Name Field */}
            <Box>
              <Typography
                component="label"
                htmlFor="name"
                sx={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                表示名
              </Typography>
              <TextField
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                disabled={loading}
                placeholder="あなたの名前"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
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

            {/* Email Field (Read-only) */}
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
                value={user?.email || ''}
                disabled
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    bgcolor: 'action.disabledBackground',
                  },
                }}
                helperText="メールアドレスは変更できません"
              />
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !name}
              fullWidth
              sx={{
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
                  <span style={{ visibility: 'hidden' }}>更新する</span>
                </>
              ) : (
                '更新する'
              )}
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
}
