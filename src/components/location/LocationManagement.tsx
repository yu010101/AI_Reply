/**
 * World-Class Location Management Component
 *
 * Design Principles:
 * - Clean card-based layout
 * - Clear visual hierarchy
 * - Accessible dialogs and forms
 * - Smooth interactions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Button,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { motion } from 'framer-motion';
import StoreIcon from '@mui/icons-material/Store';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { Location } from '@/types';
import axios from 'axios';
import { staggerContainer, staggerItem } from '@/utils/animations';
import { EmptyStatePresets } from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export const LocationManagement = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tone: '',
    line_user_id: '',
  });

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<{ data: Location[] }>('/api/locations');
      setLocations(response.data.data || []);
    } catch (error) {
      console.error('店舗の取得に失敗しました:', error);
      setError('店舗情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenDialog = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpen(false);
    setFormData({ name: '', tone: '', line_user_id: '' });
  }, []);

  const handleInputChange = useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const handleCreateLocation = useCallback(async () => {
    try {
      setSubmitting(true);
      await axios.post<{ data: Location }>('/api/locations', formData);
      handleCloseDialog();
      fetchLocations();
    } catch (error) {
      console.error('店舗の作成に失敗しました:', error);
      setError('店舗の作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }, [formData, handleCloseDialog, fetchLocations]);

  const handleDeleteLocation = useCallback(
    async (id: string) => {
      if (!window.confirm('この店舗を削除してもよろしいですか？')) return;
      try {
        await axios.delete(`/api/locations/${id}`);
        fetchLocations();
      } catch (error) {
        console.error('店舗の削除に失敗しました:', error);
        setError('店舗の削除に失敗しました');
      }
    },
    [fetchLocations]
  );

  const isFormValid = formData.name.trim().length > 0;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner size="lg" label="店舗情報を読み込み中..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <StoreIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                店舗管理
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              登録された店舗の管理と新規店舗の追加ができます
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              px: 2.5,
              py: 1,
            }}
          >
            新規店舗を追加
          </Button>
        </Box>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <EmptyStatePresets.NoLocations onAction={handleOpenDialog} />
          </Box>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <Grid container spacing={3}>
            {locations.map((location) => (
              <Grid item xs={12} sm={6} md={4} key={location.id}>
                <motion.div variants={staggerItem}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      },
                    }}
                  >
                    {/* Card Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.default',
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <StorefrontOutlinedIcon sx={{ fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {location.name}
                        </Typography>
                        {location.tone && (
                          <Chip
                            icon={<TuneOutlinedIcon sx={{ fontSize: 14 }} />}
                            label={location.tone}
                            size="small"
                            sx={{
                              mt: 0.5,
                              height: 22,
                              fontSize: '0.75rem',
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Card Content */}
                    <Box sx={{ p: 2.5 }}>
                      {location.line_user_id ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          LINE ID: {location.line_user_id}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          LINE未連携
                        </Typography>
                      )}
                    </Box>

                    {/* Card Actions */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1,
                        p: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label="編集"
                        sx={{
                          '&:focus-visible': {
                            boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                          },
                        }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="削除"
                        onClick={() => handleDeleteLocation(location.id)}
                        sx={{
                          '&:focus-visible': {
                            boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #EF4444',
                          },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}

      {/* Create Location Dialog */}
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            新規店舗を追加
          </Typography>
          <IconButton
            aria-label="閉じる"
            onClick={handleCloseDialog}
            sx={{
              '&:focus-visible': {
                boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {/* Store Name */}
            <Box>
              <Typography
                component="label"
                htmlFor="store-name"
                sx={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                店舗名 <span style={{ color: '#EF4444' }}>*</span>
              </Typography>
              <TextField
                id="store-name"
                autoFocus
                fullWidth
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="例: 渋谷店"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StorefrontOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
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

            {/* Tone */}
            <Box>
              <Typography
                component="label"
                htmlFor="store-tone"
                sx={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                トーン（AIの返信スタイル）
              </Typography>
              <TextField
                id="store-tone"
                fullWidth
                value={formData.tone}
                onChange={handleInputChange('tone')}
                placeholder="例: フレンドリー、丁寧"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TuneOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
                helperText="AIがレビューに返信する際のトーンを設定します"
              />
            </Box>

            {/* LINE User ID */}
            <Box>
              <Typography
                component="label"
                htmlFor="store-line-id"
                sx={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                LINEユーザーID（オプション）
              </Typography>
              <TextField
                id="store-line-id"
                fullWidth
                value={formData.line_user_id}
                onChange={handleInputChange('line_user_id')}
                placeholder="例: U1234567890abcdef"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
                helperText="LINE通知を受け取る場合に設定してください"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={submitting}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateLocation}
            disabled={!isFormValid || submitting}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              position: 'relative',
            }}
          >
            {submitting ? (
              <>
                <CircularProgress
                  size={20}
                  sx={{
                    color: 'inherit',
                    position: 'absolute',
                  }}
                />
                <span style={{ visibility: 'hidden' }}>作成する</span>
              </>
            ) : (
              '作成する'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
