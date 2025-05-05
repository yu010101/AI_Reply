import { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, List, ListItem, ListItemText } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';

interface SyncReviewsButtonProps {
  onSyncComplete?: (result: any) => void;
}

export default function SyncReviewsButton({ onSyncComplete }: SyncReviewsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [openDialog, setOpenDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google-reviews/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

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
        setSnackbarMessage(`同期に失敗しました: ${result.error}`);
        setSnackbarSeverity('error');
      }
    } catch (error) {
      console.error('同期エラー:', error);
      setSnackbarMessage('同期処理中にエラーが発生しました');
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
      setOpenSnackbar(true);
    }
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
        onClick={handleSync}
        disabled={loading}
      >
        {loading ? '同期中...' : 'Googleレビュー同期'}
      </Button>

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

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                詳細:
              </Typography>
              <List>
                {syncResult.results.map((item: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`店舗ID: ${item.locationId}`}
                      secondary={
                        item.error
                          ? `エラー: ${item.error}`
                          : `${item.result.total} 件のレビュー中 ${item.result.saved} 件を新規保存しました`
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