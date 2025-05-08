import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';

interface ReplyTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export default function ReplyTemplateManager() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '',
    language: 'ja',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('reply_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: ReplyTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        content: template.content,
        category: template.category,
        language: template.language,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        content: '',
        category: '',
        language: 'ja',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('reply_templates')
          .update({
            name: formData.name,
            content: formData.content,
            category: formData.category,
            language: formData.language,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reply_templates')
          .insert([{
            name: formData.name,
            content: formData.content,
            category: formData.category,
            language: formData.language,
          }]);

        if (error) throw error;
      }

      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) return;

    try {
      const { error } = await supabase
        .from('reply_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">返信テンプレート管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新規テンプレート
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  カテゴリー: {template.category}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  言語: {template.language === 'ja' ? '日本語' : '英語'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {template.content}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton onClick={() => handleOpenDialog(template)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(template.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'テンプレート編集' : '新規テンプレート作成'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="テンプレート名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="内容"
              multiline
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>カテゴリー</InputLabel>
              <Select
                value={formData.category}
                label="カテゴリー"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="positive">高評価</MenuItem>
                <MenuItem value="neutral">中評価</MenuItem>
                <MenuItem value="negative">低評価</MenuItem>
                <MenuItem value="general">一般</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>言語</InputLabel>
              <Select
                value={formData.language}
                label="言語"
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              >
                <MenuItem value="ja">日本語</MenuItem>
                <MenuItem value="en">英語</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button onClick={handleSubmit} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 