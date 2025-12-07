import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Alert,
  Link,
} from '@mui/material';
import CookieIcon from '@mui/icons-material/Cookie';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';
import { motion } from 'framer-motion';

/**
 * Cookie Settings Panel Component
 *
 * This component can be used in a settings page to allow users
 * to manage their cookie preferences after the initial consent.
 *
 * Usage:
 * ```tsx
 * import { CookieSettingsPanel } from '@/components/legal/CookieSettingsPanel';
 *
 * function SettingsPage() {
 *   return (
 *     <div>
 *       <h1>Settings</h1>
 *       <CookieSettingsPanel />
 *     </div>
 *   );
 * }
 * ```
 */
export const CookieSettingsPanel: React.FC = () => {
  const {
    consent,
    updatePreferences,
    revokeConsent,
    hasConsent,
  } = useCookieConsent();

  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: consent?.preferences.analytics ?? false,
    marketing: consent?.preferences.marketing ?? false,
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    updatePreferences(preferences);
    setShowSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleRevokeAll = () => {
    if (window.confirm('すべてのCookie設定をリセットしてもよろしいですか？')) {
      revokeConsent();
      setPreferences({
        necessary: true,
        analytics: false,
        marketing: false,
      });
    }
  };

  const hasChanges =
    preferences.analytics !== (consent?.preferences.analytics ?? false) ||
    preferences.marketing !== (consent?.preferences.marketing ?? false);

  return (
    <Card
      sx={{
        maxWidth: 800,
        mx: 'auto',
        borderRadius: 3,
        boxShadow: 3,
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <CookieIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Cookie設定
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Cookieの使用設定を管理できます
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Alert severity="success" sx={{ mb: 3 }}>
              Cookie設定を保存しました
            </Alert>
          </motion.div>
        )}

        {/* Info Alert */}
        {!hasConsent && (
          <Alert
            severity="info"
            icon={<InfoIcon />}
            sx={{ mb: 3 }}
          >
            まだCookie設定を行っていません。以下で設定を選択してください。
          </Alert>
        )}

        {/* Current Consent Info */}
        {consent && (
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>最終更新:</strong>{' '}
              {new Date(consent.timestamp).toLocaleString('ja-JP')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              <strong>バージョン:</strong> {consent.version}
            </Typography>
          </Box>
        )}

        {/* Cookie Categories */}
        <Box sx={{ mb: 4 }}>
          {/* Necessary Cookies */}
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              backgroundColor: 'grey.50',
              border: '2px solid',
              borderColor: 'grey.300',
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
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    必須Cookie
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', lineHeight: 1.6 }}
                  >
                    これらのCookieはウェブサイトの基本機能に必要です。
                    ログイン状態の維持、セキュリティ、セッション管理などに使用されます。
                    これらのCookieは無効にできません。
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, width: '100%' }}
            />
          </Box>

          {/* Analytics Cookies */}
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              border: '2px solid',
              borderColor: preferences.analytics
                ? 'primary.main'
                : 'grey.200',
              backgroundColor: preferences.analytics
                ? 'primary.50'
                : 'transparent',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: preferences.analytics
                  ? 'primary.100'
                  : 'primary.50',
              },
            }}
            onClick={() => handleToggle('analytics')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.analytics}
                  onChange={() => handleToggle('analytics')}
                  color="primary"
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    分析Cookie
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', lineHeight: 1.6 }}
                  >
                    これらのCookieは、サイトの利用状況を分析し、
                    サービスの改善に役立てるために使用されます。
                    Google Analyticsなどのツールを使用して、
                    ページビュー、滞在時間、クリックイベントなどを追跡します。
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>

          {/* Marketing Cookies */}
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              border: '2px solid',
              borderColor: preferences.marketing
                ? 'primary.main'
                : 'grey.200',
              backgroundColor: preferences.marketing
                ? 'primary.50'
                : 'transparent',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: preferences.marketing
                  ? 'primary.100'
                  : 'primary.50',
              },
            }}
            onClick={() => handleToggle('marketing')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.marketing}
                  onChange={() => handleToggle('marketing')}
                  color="primary"
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    マーケティングCookie
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', lineHeight: 1.6 }}
                  >
                    これらのCookieは、お客様の興味や関心に基づいた広告を表示するために使用されます。
                    第三者の広告サービス（Facebook、Google Ads、LinkedInなど）と
                    情報を共有する場合があります。
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        </Box>

        {/* Additional Information */}
        <Box
          sx={{
            mb: 4,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'info.50',
            border: '1px solid',
            borderColor: 'info.200',
          }}
        >
          <Typography variant="body2" sx={{ color: 'info.dark', lineHeight: 1.6 }}>
            <InfoIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
            Cookieの使用に関する詳細については、
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

        <Divider sx={{ mb: 3 }} />

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="outlined"
            color="error"
            onClick={handleRevokeAll}
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            すべてリセット
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges}
            startIcon={<SaveIcon />}
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
            {hasChanges ? '変更を保存' : '保存済み'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
