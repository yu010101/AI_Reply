import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Grid, Chip, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Divider, Alert } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';

interface ReplyTemplate {
  id: string;
  tenant_id: string;
  name: string;
  content: string;
  tone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function ReplyTemplateManager() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ダイアログ状態
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogError, setDialogError] = useState<string | null>(null);

  // 編集中のテンプレート
  const [currentTemplate, setCurrentTemplate] = useState<ReplyTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    tone: 'friendly',
    is_default: false,
  });

  // テンプレート一覧を取得
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('reply_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setTemplates(data || []);
    } catch (err) {
      console.error('テンプレート取得エラー:', err);
      setError('テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ダイアログを開く
  const handleOpenDialog = (mode: 'create' | 'edit', template?: ReplyTemplate) => {
    setDialogMode(mode);
    setDialogError(null);
    
    if (mode === 'edit' && template) {
      setCurrentTemplate(template);
      setFormData({
        name: template.name,
        content: template.content,
        tone: template.tone,
        is_default: template.is_default,
      });
    } else {
      setCurrentTemplate(null);
      setFormData({
        name: '',
        content: '',
        tone: 'friendly',
        is_default: false,
      });
    }
    
    setOpenDialog(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // フォーム入力変更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // セレクト入力変更
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      tone: e.target.value,
    });
  };

  // デフォルト設定変更
  const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      is_default: e.target.checked,
    });
  };

  // テンプレート保存
  const handleSaveTemplate = async () => {
    try {
      setSaveLoading(true);
      setDialogError(null);
      
      // 入力検証
      if (!formData.name.trim()) {
        setDialogError('テンプレート名を入力してください');
        return;
      }
      
      if (!formData.content.trim()) {
        setDialogError('テンプレート内容を入力してください');
        return;
      }
      
      if (formData.is_default) {
        // 既存のデフォルトテンプレートがあれば、デフォルト設定を解除
        await supabase
          .from('reply_templates')
          .update({ is_default: false })
          .eq('is_default', true);
      }
      
      if (dialogMode === 'create') {
        // 新規作成
        const { error } = await supabase
          .from('reply_templates')
          .insert({
            name: formData.name,
            content: formData.content,
            tone: formData.tone,
            is_default: formData.is_default,
          });
        
        if (error) throw error;
        
        setSuccess('テンプレートを作成しました');
      } else {
        // 編集
        if (!currentTemplate) return;
        
        const { error } = await supabase
          .from('reply_templates')
          .update({
            name: formData.name,
            content: formData.content,
            tone: formData.tone,
            is_default: formData.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentTemplate.id);
        
        if (error) throw error;
        
        setSuccess('テンプレートを更新しました');
      }
      
      // テンプレート一覧を再取得
      fetchTemplates();
      handleCloseDialog();
      
      // 成功メッセージをクリア
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('テンプレート保存エラー:', err);
      setDialogError('テンプレートの保存に失敗しました');
    } finally {
      setSaveLoading(false);
    }
  };

  // テンプレート削除
  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('このテンプレートを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('reply_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('テンプレートを削除しました');
      
      // テンプレート一覧を再取得
      fetchTemplates();
      
      // 成功メッセージをクリア
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('テンプレート削除エラー:', err);
      setError('テンプレートの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // トーン名を日本語に変換
  const translateTone = (tone: string) => {
    const toneMap: { [key: string]: string } = {
      'friendly': '親しみやすい',
      'formal': 'フォーマル',
      'apologetic': '謝罪',
      'grateful': '感謝',
      'professional': 'ビジネス',
    };
    return toneMap[tone] || tone;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          返信テンプレート管理
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          テンプレート追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Box textAlign="center" my={4}>
          <Typography variant="body1">
            テンプレートがありません。新しいテンプレートを追加してください。
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" component="div">
                      {template.name}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog('edit', template)}
                        aria-label="編集"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTemplate(template.id)}
                        aria-label="削除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={translateTone(template.tone)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {template.is_default && (
                      <Chip label="デフォルト" size="small" color="secondary" />
                    )}
                  </Box>
                  
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {template.content.length > 150
                      ? `${template.content.substring(0, 150)}...`
                      : template.content}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* テンプレート作成・編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'テンプレート追加' : 'テンプレート編集'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="テンプレート名"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="tone-select-label">トーン</InputLabel>
            <Select
              labelId="tone-select-label"
              label="トーン"
              name="tone"
              value={formData.tone}
              onChange={handleSelectChange}
            >
              <MenuItem value="friendly">親しみやすい</MenuItem>
              <MenuItem value="formal">フォーマル</MenuItem>
              <MenuItem value="apologetic">謝罪</MenuItem>
              <MenuItem value="grateful">感謝</MenuItem>
              <MenuItem value="professional">ビジネス</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="テンプレート内容"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            placeholder="{{店舗名}}、{{レビュー評価}}、{{投稿者名}}などの変数を使用できます"
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 1 }}>
            <label>
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleDefaultChange}
              />
              デフォルトテンプレートとして設定
            </label>
          </FormControl>
          
          <Typography variant="caption" color="text.secondary">
            ※デフォルトに設定すると、AI返信生成時にこのテンプレートが優先的に使用されます
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSaveTemplate}
            color="primary"
            variant="contained"
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 