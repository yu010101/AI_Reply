import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Switch, FormControlLabel, Button, CircularProgress, Snackbar, Alert, Grid, Slider, InputAdornment } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: '',
    tenant_id: '',
    notification_email: '',
    notify_all_reviews: false,
    notify_low_ratings: true,
    low_rating_threshold: 3,
    email_daily_summary: false,
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('tenant_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('通知設定取得エラー:', error);
        setSnackbarMessage('通知設定の取得に失敗しました');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      } else if (data) {
        setSettings(data);
      } else {
        // 設定がまだ存在しない場合はデフォルト値を使用
        setSettings({
          id: '',
          tenant_id: user?.id || '',
          notification_email: user?.email || '',
          notify_all_reviews: false,
          notify_low_ratings: true,
          low_rating_threshold: 3,
          email_daily_summary: false,
        });
      }
    } catch (error) {
      console.error('通知設定取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // 通知メールアドレスの検証
      if (!settings.notification_email) {
        setSnackbarMessage('通知メールアドレスを入力してください');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        setSaving(false);
        return;
      }

      // 既存の設定があるかどうかで更新か挿入かを決定
      if (settings.id) {
        const { error } = await supabase
          .from('notification_settings')
          .update({
            notification_email: settings.notification_email,
            notify_all_reviews: settings.notify_all_reviews,
            notify_low_ratings: settings.notify_low_ratings,
            low_rating_threshold: settings.low_rating_threshold,
            email_daily_summary: settings.email_daily_summary,
          })
          .eq('id', settings.id);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from('notification_settings')
          .insert({
            tenant_id: user?.id,
            notification_email: settings.notification_email,
            notify_all_reviews: settings.notify_all_reviews,
            notify_low_ratings: settings.notify_low_ratings,
            low_rating_threshold: settings.low_rating_threshold,
            email_daily_summary: settings.email_daily_summary,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setSettings({ ...settings, id: data.id });
        }
      }

      setSnackbarMessage('通知設定を保存しました');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error: any) {
      console.error('通知設定保存エラー:', error);
      setSnackbarMessage(`通知設定の保存に失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setSettings({
      ...settings,
      low_rating_threshold: newValue as number,
    });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // テスト通知を送信
  const handleTestNotification = async () => {
    try {
      setSaving(true);
      setSnackbarMessage('テスト通知を送信中...');
      setSnackbarSeverity('info');
      setOpenSnackbar(true);

      // まず設定を保存
      await handleSaveSettings();

      // テスト通知APIをコール
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: settings.notification_email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSnackbarMessage(`テスト通知を ${settings.notification_email} に送信しました`);
        setSnackbarSeverity('success');
      } else {
        setSnackbarMessage(`テスト通知の送信に失敗しました: ${result.error}`);
        setSnackbarSeverity('error');
      }
    } catch (error: any) {
      console.error('テスト通知エラー:', error);
      setSnackbarMessage(`テスト通知の送信に失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
    } finally {
      setSaving(false);
      setOpenSnackbar(true);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        通知設定
      </Typography>

      <Box component="form" noValidate sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="通知メールアドレス"
              name="notification_email"
              value={settings.notification_email}
              onChange={handleInputChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notify_all_reviews}
                  onChange={handleInputChange}
                  name="notify_all_reviews"
                />
              }
              label="すべてのレビューを通知する"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notify_low_ratings}
                  onChange={handleInputChange}
                  name="notify_low_ratings"
                />
              }
              label="低評価レビューを通知する"
            />
          </Grid>

          {settings.notify_low_ratings && (
            <Grid item xs={12}>
              <Typography id="low-rating-threshold-slider" gutterBottom>
                低評価の閾値: {settings.low_rating_threshold}点以下
              </Typography>
              <Slider
                value={settings.low_rating_threshold}
                onChange={handleSliderChange}
                aria-labelledby="low-rating-threshold-slider"
                step={1}
                marks
                min={1}
                max={4}
                valueLabelDisplay="auto"
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.email_daily_summary}
                  onChange={handleInputChange}
                  name="email_daily_summary"
                />
              }
              label="毎日のサマリーメールを受け取る"
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : '設定を保存'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleTestNotification}
                disabled={saving || !settings.notification_email}
              >
                テスト通知を送信
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
} 