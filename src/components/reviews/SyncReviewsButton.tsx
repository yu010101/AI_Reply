import { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, List, ListItem, ListItemText, Box, LinearProgress } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ReplayIcon from '@mui/icons-material/Replay';

interface SyncReviewsButtonProps {
  onSyncComplete?: (result: any) => void;
}

interface SyncResult {
  success: boolean;
  totalLocations: number;
  successfulLocations: number;
  failedLocations: number;
  results: Array<{
    locationId: string;
    locationName?: string;
    error?: string;
    result?: {
      total: number;
      saved: number;
      errors?: any[];
    };
  }>;
}

export default function SyncReviewsButton({ onSyncComplete }: SyncReviewsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [openDialog, setOpenDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const handleSync = async (retryFailedOnly = false) => {
    setLoading(true);
    setRetrying(retryFailedOnly);
    setSyncProgress(0);
    
    try {
      // 進行状況表示のためのタイマー設定
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 1000);

      const endpoint = retryFailedOnly 
        ? '/api/google-reviews/sync-all?retryFailed=true' 
        : '/api/google-reviews/sync-all';
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          failedLocations: retryFailedOnly && syncResult 
            ? syncResult.results
                .filter(item => item.error)
                .map(item => item.locationId) 
            : undefined
        }),
      });

      // 進行状況タイマー解除
      clearInterval(progressInterval);
      setSyncProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`サーバーエラー: ${response.status} ${response.statusText}${errorData.error ? ` - ${errorData.error}` : ''}`);
      }

      const result = await response.json();

      if (result.success) {
        setSyncResult(result);
        setSnackbarMessage(`同期が完了しました。${result.successfulLocations}店舗のレビューを更新しました。`);
        setSnackbarSeverity('success');
        setOpenDialog(true);
        
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      } else {
        setSnackbarMessage(`同期に失敗しました: ${result.error || '不明なエラー'}`);
        setSnackbarSeverity('error');
      }
    } catch (error: any) {
      console.error('同期エラー:', error);
      setSnackbarMessage(`同期処理中にエラーが発生しました: ${error.message || '不明なエラー'}`);
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
      setRetrying(false);
      setOpenSnackbar(true);
    }
  };

  const handleRetryFailed = () => {
    handleSync(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
        onClick={() => handleSync(false)}
        disabled={loading}
      >
        {loading && !retrying ? '同期中...' : 'Googleレビュー同期'}
      </Button>

      {loading && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress variant="determinate" value={syncProgress} />
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {syncProgress < 100 ? '処理中...' : '完了'}
          </Typography>
        </Box>
      )}

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>レビュー同期結果</DialogTitle>
        <DialogContent>
          {syncResult && (
            <>
              <Typography variant="body1" gutterBottom>
                合計: {syncResult.totalLocations}店舗
              </Typography>
              <Typography variant="body1" gutterBottom>
                成功: {syncResult.successfulLocations}店舗
              </Typography>
              <Typography variant="body1" gutterBottom>
                失敗: {syncResult.failedLocations}店舗
              </Typography>

              {syncResult.failedLocations > 0 && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={retrying ? <CircularProgress size={20} color="inherit" /> : <ReplayIcon />}
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  sx={{ mt: 1, mb: 2 }}
                >
                  失敗した店舗を再試行
                </Button>
              )}

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                詳細:
              </Typography>
              <List>
                {syncResult.results.map((item, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`店舗: ${item.locationName || item.locationId}`}
                      secondary={
                        <>
                          {item.error ? (
                            <Typography color="error">エラー: {item.error}</Typography>
                          ) : (
                            <>
                              <Typography>
                                {item.result?.total} 件のレビュー中 {item.result?.saved} 件を新規保存しました
                              </Typography>
                              {item.result?.errors && item.result.errors.length > 0 && (
                                <Typography color="warning.main">
                                  警告: {item.result.errors.length}件のエラーが発生しました
                                </Typography>
                              )}
                            </>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 