import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  FormGroup,
  Typography,
  Link,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import CookieIcon from '@mui/icons-material/Cookie';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';

export const CookieConsent: React.FC = () => {
  const {
    showBanner,
    acceptAll,
    acceptNecessaryOnly,
    updatePreferences,
    consent,
  } = useCookieConsent();

  const [showSettings, setShowSettings] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: consent?.preferences.analytics ?? false,
    marketing: consent?.preferences.marketing ?? false,
  });

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSaveSettings = () => {
    updatePreferences(tempPreferences);
    setShowSettings(false);
  };

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies

    setTempPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {/* Cookie Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: { xs: 0, sm: '16px 16px 0 0' },
                backgroundColor: 'background.paper',
                borderTop: '4px solid',
                borderColor: 'primary.main',
              }}
            >
              <Box
                sx={{
                  maxWidth: '1200px',
                  margin: '0 auto',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <CookieIcon
                    sx={{
                      fontSize: { xs: 32, sm: 40 },
                      color: 'primary.main',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      }}
                    >
                      Cookieの使用について
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        mb: 2,
                        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                        lineHeight: 1.6,
                      }}
                    >
                      当サイトでは、サービスの提供および改善のためにCookieを使用しています。
                      必須Cookieはサービスの基本機能に必要です。分析Cookieはサイトの利用状況を把握し、
                      サービスを改善するために使用されます。マーケティングCookieは、
                      お客様に関連性の高いコンテンツを提供するために使用されます。
                      <br />
                      詳細については、
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mx: 0.5 }}
                      >
                        プライバシーポリシー
                      </Link>
                      および
                      <Link
                        href="/cookie-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mx: 0.5 }}
                      >
                        Cookie ポリシー
                      </Link>
                      をご確認ください。
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={handleOpenSettings}
                    startIcon={<SettingsIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    設定
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={acceptNecessaryOnly}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    必要なCookieのみ
                  </Button>
                  <Button
                    variant="contained"
                    onClick={acceptAll}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                  >
                    すべて許可
                  </Button>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={handleCloseSettings}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Cookie設定
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseSettings}
            size="small"
            sx={{
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          <Typography
            variant="body2"
            sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6 }}
          >
            Cookie設定を管理できます。必須Cookieはサービスの基本機能に必要なため、
            無効にすることはできません。その他のCookieは個別に有効/無効を選択できます。
          </Typography>

          <FormGroup>
            {/* Necessary Cookies */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={true}
                    disabled={true}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      必須Cookie
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      サイトの基本機能（ログイン状態の維持、セキュリティなど）に必要です。
                      これらのCookieは無効にできません。
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0 }}
              />
            </Box>

            {/* Analytics Cookies */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: tempPreferences.analytics
                  ? 'primary.main'
                  : 'grey.200',
                backgroundColor: tempPreferences.analytics
                  ? 'primary.50'
                  : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={tempPreferences.analytics}
                    onChange={() => handleToggle('analytics')}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      分析Cookie
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      サイトの利用状況を分析し、サービスの改善に役立てます。
                      Google Analyticsなどのツールを使用します。
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0 }}
              />
            </Box>

            {/* Marketing Cookies */}
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: tempPreferences.marketing
                  ? 'primary.main'
                  : 'grey.200',
                backgroundColor: tempPreferences.marketing
                  ? 'primary.50'
                  : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={tempPreferences.marketing}
                    onChange={() => handleToggle('marketing')}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      マーケティングCookie
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      お客様の興味や関心に基づいた広告を表示するために使用されます。
                      第三者の広告サービスと情報を共有する場合があります。
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0 }}
              />
            </Box>
          </FormGroup>

          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              backgroundColor: 'info.50',
              border: '1px solid',
              borderColor: 'info.200',
            }}
          >
            <Typography variant="body2" sx={{ color: 'info.dark' }}>
              詳細については、
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mx: 0.5, fontWeight: 600 }}
              >
                プライバシーポリシー
              </Link>
              および
              <Link
                href="/cookie-policy"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mx: 0.5, fontWeight: 600 }}
              >
                Cookie ポリシー
              </Link>
              をご確認ください。
            </Typography>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={handleCloseSettings}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              },
            }}
          >
            設定を保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
