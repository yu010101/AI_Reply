import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Grid,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Stack,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  GetApp as GetAppIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import axios from 'axios';

interface Invoice {
  id: string;
  organization_id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  subscription_id: string | null;
  amount: number;
  status: string;
  due_date: string;
  sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
    display_name: string;
  };
}

interface InvoiceItem {
  description: string;
  amount: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [sendDialogOpen, setSendDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  // 新規請求書フォームの状態
  const [invoiceDescription, setInvoiceDescription] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }]);
  const [invoiceAdditionalInfo, setInvoiceAdditionalInfo] = useState<string>('');
  const [sendImmediately, setSendImmediately] = useState<boolean>(false);

  // 初期データ読み込み
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ユーザーが所属する組織を取得
        const { data: orgData, error: orgError } = await supabase
          .from('organization_users')
          .select(`
            organizations:organization_id(
              id, name, display_name
            )
          `);

        if (orgError) {
          console.error('組織取得エラー:', orgError);
          setError('組織データの取得に失敗しました');
          setLoading(false);
          return;
        }

        const orgs = orgData.map((item: any) => item.organizations);
        setOrganizations(orgs);

        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 選択された組織が変更されたら、請求書を再取得
  useEffect(() => {
    if (selectedOrgId) {
      fetchInvoices();
    }
  }, [selectedOrgId]);

  // 請求書の取得
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          organization:organization_id(
            name, display_name
          )
        `)
        .eq('organization_id', selectedOrgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('請求書取得エラー:', error);
        setError('請求書データの取得に失敗しました');
        setLoading(false);
        return;
      }

      setInvoices(data || []);
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 請求書作成ダイアログを開く
  const handleOpenCreateDialog = () => {
    setInvoiceDescription('');
    setInvoiceItems([{ description: '', amount: 0 }]);
    setInvoiceAdditionalInfo('');
    setSendImmediately(false);
    setCreateDialogOpen(true);
  };

  // 請求書作成ダイアログを閉じる
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // 請求書送信ダイアログを開く
  const handleOpenSendDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSendDialogOpen(true);
  };

  // 請求書送信ダイアログを閉じる
  const handleCloseSendDialog = () => {
    setSendDialogOpen(false);
    setSelectedInvoice(null);
  };

  // 請求書削除ダイアログを開く
  const handleOpenDeleteDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  // 請求書削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 請求書項目の追加
  const handleAddInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', amount: 0 }]);
  };

  // 請求書項目の削除
  const handleRemoveInvoiceItem = (index: number) => {
    const newItems = [...invoiceItems];
    newItems.splice(index, 1);
    setInvoiceItems(newItems);
  };

  // 請求書項目の更新
  const handleInvoiceItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    const newItems = [...invoiceItems];
    if (field === 'description') {
      newItems[index].description = value as string;
    } else {
      newItems[index].amount = value as number;
    }
    setInvoiceItems(newItems);
  };

  // 請求書の作成
  const handleCreateInvoice = async () => {
    setError(null);
    setSuccess(null);

    // バリデーション
    if (!selectedOrgId) {
      setError('組織を選択してください');
      return;
    }

    if (invoiceItems.some(item => !item.description || item.amount <= 0)) {
      setError('すべての請求項目に説明と金額（0より大きい値）を入力してください');
      return;
    }

    try {
      const response = await axios.post('/api/subscriptions/create-invoice', {
        organizationId: selectedOrgId,
        description: invoiceDescription || undefined,
        items: invoiceItems,
        additionalInfo: invoiceAdditionalInfo ? JSON.parse(invoiceAdditionalInfo) : undefined,
        sendImmediately
      });

      setSuccess('請求書を作成しました');
      setCreateDialogOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error('請求書作成エラー:', err);
      setError(err.response?.data?.error || '請求書の作成に失敗しました');
    }
  };

  // 請求書の送信
  const handleSendInvoice = async () => {
    if (!selectedInvoice) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/subscriptions/send-invoice', {
        invoiceId: selectedInvoice.stripe_invoice_id
      });

      setSuccess('請求書を送信しました');
      setSendDialogOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error('請求書送信エラー:', err);
      setError(err.response?.data?.error || '請求書の送信に失敗しました');
    }
  };

  // 請求書の削除（無効化）
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/subscriptions/void-invoice', {
        invoiceId: selectedInvoice.stripe_invoice_id
      });

      setSuccess('請求書を無効化しました');
      setDeleteDialogOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error('請求書削除エラー:', err);
      setError(err.response?.data?.error || '請求書の無効化に失敗しました');
    }
  };

  // 請求書のステータスに応じた色を取得
  const getInvoiceStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const statusMap: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      draft: 'default',
      open: 'warning',
      paid: 'success',
      uncollectible: 'error',
      void: 'error'
    };
    return statusMap[status] || 'default';
  };

  // 請求書のステータスを日本語に変換
  const translateInvoiceStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      draft: '下書き',
      open: '未払い',
      paid: '支払い済み',
      uncollectible: '回収不能',
      void: '無効'
    };
    return statusMap[status] || status;
  };

  // 金額のフォーマット
  const formatAmount = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            請求書管理
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* 組織選択と請求書作成ボタン */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>組織</InputLabel>
                  <Select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value as string)}
                    label="組織"
                  >
                    {organizations.map((org) => (
                      <MenuItem key={org.id} value={org.id}>
                        {org.display_name || org.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateDialog}
                  disabled={!selectedOrgId || loading}
                  sx={{ mr: 1 }}
                >
                  新規請求書作成
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchInvoices}
                  disabled={!selectedOrgId || loading}
                >
                  更新
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* 請求書リスト */}
          <Paper>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>請求書ID</TableCell>
                      <TableCell>作成日</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>金額</TableCell>
                      <TableCell>支払期限</TableCell>
                      <TableCell>送信状態</TableCell>
                      <TableCell align="right">アクション</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length > 0 ? (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.stripe_invoice_id.slice(-8)}</TableCell>
                          <TableCell>
                            {new Date(invoice.created_at).toLocaleDateString('ja-JP')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={translateInvoiceStatus(invoice.status)}
                              color={getInvoiceStatusColor(invoice.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatAmount(invoice.amount / 100)}</TableCell>
                          <TableCell>
                            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ja-JP') : '-'}
                          </TableCell>
                          <TableCell>
                            {invoice.sent_at ? (
                              <Chip label="送信済み" color="success" size="small" />
                            ) : (
                              <Chip label="未送信" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="詳細を表示">
                              <IconButton
                                color="primary"
                                onClick={() => window.open(`https://dashboard.stripe.com/invoices/${invoice.stripe_invoice_id}`, '_blank')}
                                size="small"
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {invoice.status === 'draft' && (
                              <>
                                <Tooltip title="送信">
                                  <IconButton
                                    color="primary"
                                    onClick={() => handleOpenSendDialog(invoice)}
                                    size="small"
                                  >
                                    <SendIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="無効化">
                                  <IconButton
                                    color="error"
                                    onClick={() => handleOpenDeleteDialog(invoice)}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="ダウンロード">
                              <IconButton
                                color="primary"
                                onClick={() => window.open(`https://invoice.stripe.com/i/${invoice.stripe_invoice_id}`)}
                                size="small"
                              >
                                <GetAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          請求書がありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* 請求書作成ダイアログ */}
          <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
            <DialogTitle>新規請求書の作成</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="請求書の説明"
                    fullWidth
                    margin="normal"
                    value={invoiceDescription}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    placeholder="例: 2023年4月分サービス利用料"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    請求項目
                  </Typography>
                  {invoiceItems.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TextField
                        label="説明"
                        value={item.description}
                        onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                        sx={{ flexGrow: 1, mr: 2 }}
                      />
                      <TextField
                        label="金額"
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleInvoiceItemChange(index, 'amount', parseFloat(e.target.value))}
                        sx={{ width: 150, mr: 2 }}
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
                        }}
                      />
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveInvoiceItem(index)}
                        disabled={invoiceItems.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddInvoiceItem}
                    sx={{ mt: 1 }}
                  >
                    項目を追加
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    追加情報（オプション）
                  </Typography>
                  <TextField
                    label="追加情報（JSON形式）"
                    multiline
                    rows={4}
                    fullWidth
                    value={invoiceAdditionalInfo}
                    onChange={(e) => setInvoiceAdditionalInfo(e.target.value)}
                    placeholder='{"custom_fields": [{"name": "リファレンス番号", "value": "REF-001"}], "footer": "お問い合わせ：support@example.com"}'
                    helperText="JSONフォーマットで入力してください"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={sendImmediately}
                        onChange={(e) => setSendImmediately(e.target.checked)}
                      />
                    }
                    label="請求書を作成後すぐに送信する"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseCreateDialog}>キャンセル</Button>
              <Button onClick={handleCreateInvoice} variant="contained" color="primary">
                請求書を作成
              </Button>
            </DialogActions>
          </Dialog>

          {/* 請求書送信確認ダイアログ */}
          <Dialog open={sendDialogOpen} onClose={handleCloseSendDialog}>
            <DialogTitle>請求書の送信</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedInvoice && `請求書 ${selectedInvoice.stripe_invoice_id.slice(-8)} を顧客に送信しますか？`}
              </DialogContentText>
              <DialogContentText sx={{ mt: 2, color: 'text.secondary' }}>
                送信後の請求書は編集できません。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSendDialog}>キャンセル</Button>
              <Button onClick={handleSendInvoice} variant="contained" color="primary">
                送信
              </Button>
            </DialogActions>
          </Dialog>

          {/* 請求書削除確認ダイアログ */}
          <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
            <DialogTitle>請求書の無効化</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedInvoice && `請求書 ${selectedInvoice.stripe_invoice_id.slice(-8)} を無効化しますか？`}
              </DialogContentText>
              <DialogContentText sx={{ mt: 2, color: 'error.main' }}>
                この操作は元に戻せません。無効化された請求書は顧客に表示されなくなります。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
              <Button onClick={handleDeleteInvoice} variant="contained" color="error">
                無効化
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 