import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CardActions,
} from '@mui/material';
import { Location } from '@/types';
import axios from 'axios';

export const LocationManagement = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tone: '',
    line_user_id: '',
  });

  const fetchLocations = async () => {
    try {
      const response = await axios.get<{ data: Location[] }>('/api/locations');
      setLocations(response.data.data);
    } catch (error) {
      console.error('店舗の取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreateLocation = async () => {
    try {
      await axios.post<{ data: Location }>('/api/locations', formData);
      setOpen(false);
      setFormData({ name: '', tone: '', line_user_id: '' });
      fetchLocations();
    } catch (error) {
      console.error('店舗の作成に失敗しました:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">店舗管理</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          新規店舗作成
        </Button>
      </Box>

      <Grid container spacing={3}>
        {locations.map((location) => (
          <Grid item xs={12} sm={6} md={4} key={location.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{location.name}</Typography>
                <Typography color="textSecondary">トーン: {location.tone}</Typography>
                <Typography color="textSecondary">LINE ID: {location.line_user_id}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small">編集</Button>
                <Button size="small" color="error">
                  削除
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>新規店舗作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="店舗名"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="トーン"
            fullWidth
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="LINEユーザーID"
            fullWidth
            value={formData.line_user_id}
            onChange={(e) => setFormData({ ...formData, line_user_id: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>キャンセル</Button>
          <Button onClick={handleCreateLocation}>作成</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 