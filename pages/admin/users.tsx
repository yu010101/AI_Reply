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
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import axios from 'axios';

// ユーザー権限の定義
const ROLES = [
  { id: 1, name: '管理者', description: '組織の全ての機能にアクセスできます。ユーザー管理、請求設定の変更が可能です。' },
  { id: 2, name: '一般ユーザー', description: 'レビュー管理、AI返信の作成が可能です。組織設定は変更できません。' },
  { id: 3, name: '閲覧のみ', description: 'レビューと返信を閲覧できますが、変更はできません。' },
];

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: number;
  created_at: string;
  user: User;
}

interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  token: string;
  role_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState<boolean>(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState<boolean>(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [deleteInviteDialogOpen, setDeleteInviteDialogOpen] = useState<boolean>(false);
  const [resendDialogOpen, setResendDialogOpen] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);

  // 招待フォームの状態
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<number>(2); // デフォルトは一般ユーザー
  
  // 権限編集フォームの状態
  const [editRole, setEditRole] = useState<number>(2);

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

  // 選択された組織が変更されたら、ユーザーと招待を再取得
  useEffect(() => {
    if (selectedOrgId) {
      fetchUsersAndInvitations();
    }
  }, [selectedOrgId]);

  // ユーザーと招待の取得
  const fetchUsersAndInvitations = async () => {
    setLoading(true);
    setError(null);

    try {
      // 組織のユーザーを取得
      const { data: userData, error: userError } = await supabase
        .from('organization_users')
        .select(`
          id,
          organization_id,
          user_id,
          role_id,
          created_at,
          user:user_id(
            id,
            email,
            created_at,
            last_sign_in_at
          )
        `)
        .eq('organization_id', selectedOrgId);

      if (userError) {
        console.error('ユーザー取得エラー:', userError);
        setError('ユーザーデータの取得に失敗しました');
        setLoading(false);
        return;
      }

      // Supabaseのクエリ結果を適切な型に変換
      const formattedUsers: OrganizationUser[] = (userData || []).map((item: any) => ({
        id: item.id,
        organization_id: item.organization_id,
        user_id: item.user_id,
        role_id: item.role_id,
        created_at: item.created_at,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      }));

      setUsers(formattedUsers);

      // 招待を取得
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', selectedOrgId)
        .order('created_at', { ascending: false });

      if (inviteError) {
        console.error('招待取得エラー:', inviteError);
        setError('招待データの取得に失敗しました');
      } else {
        setInvitations(inviteData || []);
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 招待ダイアログを開く
  const handleOpenInviteDialog = () => {
    setInviteEmail('');
    setInviteRole(2);
    setInviteDialogOpen(true);
  };

  // 招待ダイアログを閉じる
  const handleCloseInviteDialog = () => {
    setInviteDialogOpen(false);
  };

  // 権限編集ダイアログを開く
  const handleOpenEditDialog = (user: OrganizationUser) => {
    setSelectedUser(user);
    setEditRole(user.role_id);
    setEditUserDialogOpen(true);
  };

  // 権限編集ダイアログを閉じる
  const handleCloseEditDialog = () => {
    setEditUserDialogOpen(false);
    setSelectedUser(null);
  };

  // 削除ダイアログを開く
  const handleOpenDeleteDialog = (user: OrganizationUser) => {
    setSelectedUser(user);
    setDeleteUserDialogOpen(true);
  };

  // 削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setDeleteUserDialogOpen(false);
    setSelectedUser(null);
  };

  // 招待削除ダイアログを開く
  const handleOpenDeleteInviteDialog = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDeleteInviteDialogOpen(true);
  };

  // 招待削除ダイアログを閉じる
  const handleCloseDeleteInviteDialog = () => {
    setDeleteInviteDialogOpen(false);
    setSelectedInvitation(null);
  };

  // 招待再送信ダイアログを開く
  const handleOpenResendDialog = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setResendDialogOpen(true);
  };

  // 招待再送信ダイアログを閉じる
  const handleCloseResendDialog = () => {
    setResendDialogOpen(false);
    setSelectedInvitation(null);
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // ユーザーを招待する
  const handleInviteUser = async () => {
    setError(null);
    setSuccess(null);

    if (!inviteEmail.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    try {
      const response = await axios.post('/api/organizations/invite', {
        organizationId: selectedOrgId,
        email: inviteEmail,
        roleId: inviteRole,
      });

      setSuccess('ユーザーを招待しました');
      setInviteDialogOpen(false);
      fetchUsersAndInvitations();
    } catch (err: any) {
      console.error('招待エラー:', err);
      setError(err.response?.data?.error || '招待の送信に失敗しました');
    }
  };

  // ユーザーの権限を変更する
  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;

    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('organization_users')
        .update({ role_id: editRole })
        .eq('id', selectedUser.id);

      if (error) {
        throw error;
      }

      setSuccess('ユーザーの権限を更新しました');
      setEditUserDialogOpen(false);
      fetchUsersAndInvitations();

      // 監査ログを記録
      await supabase.from('audit_logs').insert([
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'user_role_update',
          resource_type: 'organization_user',
          resource_id: selectedUser.id,
          details: JSON.stringify({
            organization_id: selectedOrgId,
            user_id: selectedUser.user_id,
            old_role_id: selectedUser.role_id,
            new_role_id: editRole,
          }),
        },
      ]);
    } catch (err: any) {
      console.error('権限更新エラー:', err);
      setError(err.message || '権限の更新に失敗しました');
    }
  };

  // ユーザーを組織から削除する
  const handleRemoveUser = async () => {
    if (!selectedUser) return;

    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) {
        throw error;
      }

      setSuccess('ユーザーを組織から削除しました');
      setDeleteUserDialogOpen(false);
      fetchUsersAndInvitations();

      // 監査ログを記録
      await supabase.from('audit_logs').insert([
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'user_removed',
          resource_type: 'organization_user',
          resource_id: selectedUser.id,
          details: JSON.stringify({
            organization_id: selectedOrgId,
            user_id: selectedUser.user_id,
            user_email: selectedUser.user.email,
          }),
        },
      ]);
    } catch (err: any) {
      console.error('ユーザー削除エラー:', err);
      setError(err.message || 'ユーザーの削除に失敗しました');
    }
  };

  // 招待をキャンセルする
  const handleCancelInvitation = async () => {
    if (!selectedInvitation) return;

    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', selectedInvitation.id);

      if (error) {
        throw error;
      }

      setSuccess('招待をキャンセルしました');
      setDeleteInviteDialogOpen(false);
      fetchUsersAndInvitations();
    } catch (err: any) {
      console.error('招待キャンセルエラー:', err);
      setError(err.message || '招待のキャンセルに失敗しました');
    }
  };

  // 招待を再送信する
  const handleResendInvitation = async () => {
    if (!selectedInvitation) return;

    setError(null);
    setSuccess(null);

    try {
      // 新しい有効期限を設定
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

      // 招待を更新
      const { error } = await supabase
        .from('invitations')
        .update({
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvitation.id);

      if (error) {
        throw error;
      }

      // 招待メールを再送信（実際のメール送信はここでは省略）
      // TODO: 実際のプロジェクトではメール送信処理を実装

      setSuccess('招待を再送信しました');
      setResendDialogOpen(false);
      fetchUsersAndInvitations();
    } catch (err: any) {
      console.error('招待再送信エラー:', err);
      setError(err.message || '招待の再送信に失敗しました');
    }
  };

  // 権限名の取得
  const getRoleName = (roleId: number) => {
    const role = ROLES.find((r) => r.id === roleId);
    return role ? role.name : '不明';
  };

  // 招待ステータスの日本語表示
  const getInvitationStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '保留中',
      accepted: '承諾済み',
      rejected: 'キャンセル',
      expired: '期限切れ',
    };
    return statusMap[status] || status;
  };

  // 招待ステータスに応じた色を取得
  const getInvitationStatusColor = (status: string) => {
    const colorMap: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      pending: 'warning',
      accepted: 'success',
      rejected: 'error',
      expired: 'default',
    };
    return colorMap[status] || 'default';
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            ユーザー管理
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

          {/* 組織選択 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
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

            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenInviteDialog}
              disabled={!selectedOrgId}
            >
              ユーザーを招待
            </Button>
          </Paper>

          {/* タブ */}
          <Box sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="user management tabs">
              <Tab label="ユーザー" id="tab-0" aria-controls="tabpanel-0" />
              <Tab label="招待" id="tab-1" aria-controls="tabpanel-1" />
            </Tabs>
          </Box>

          {/* ユーザーリスト */}
          <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0">
            {tabValue === 0 && (
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
                          <TableCell>メールアドレス</TableCell>
                          <TableCell>権限</TableCell>
                          <TableCell>参加日</TableCell>
                          <TableCell>最終ログイン</TableCell>
                          <TableCell align="right">アクション</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.length > 0 ? (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.user.email}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={getRoleName(user.role_id)} 
                                  color={user.role_id === 1 ? 'primary' : 'default'} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(user.created_at).toLocaleDateString('ja-JP')}
                              </TableCell>
                              <TableCell>
                                {user.user.last_sign_in_at
                                  ? new Date(user.user.last_sign_in_at).toLocaleDateString('ja-JP')
                                  : 'なし'}
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="権限を編集">
                                  <IconButton
                                    color="primary"
                                    onClick={() => handleOpenEditDialog(user)}
                                    size="small"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="削除">
                                  <IconButton
                                    color="error"
                                    onClick={() => handleOpenDeleteDialog(user)}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              ユーザーがいません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )}
          </Box>

          {/* 招待リスト */}
          <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1">
            {tabValue === 1 && (
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
                          <TableCell>メールアドレス</TableCell>
                          <TableCell>権限</TableCell>
                          <TableCell>ステータス</TableCell>
                          <TableCell>招待日</TableCell>
                          <TableCell>有効期限</TableCell>
                          <TableCell align="right">アクション</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invitations.length > 0 ? (
                          invitations.map((invitation) => (
                            <TableRow key={invitation.id}>
                              <TableCell>{invitation.email}</TableCell>
                              <TableCell>{getRoleName(invitation.role_id)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={getInvitationStatus(invitation.status)}
                                  color={getInvitationStatusColor(invitation.status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(invitation.created_at).toLocaleDateString('ja-JP')}
                              </TableCell>
                              <TableCell>
                                {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                              </TableCell>
                              <TableCell align="right">
                                {invitation.status === 'pending' && (
                                  <>
                                    <Tooltip title="招待を再送信">
                                      <IconButton
                                        color="primary"
                                        onClick={() => handleOpenResendDialog(invitation)}
                                        size="small"
                                      >
                                        <EmailIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="招待をキャンセル">
                                      <IconButton
                                        color="error"
                                        onClick={() => handleOpenDeleteInviteDialog(invitation)}
                                        size="small"
                                      >
                                        <CancelIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              招待がありません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )}
          </Box>

          {/* ユーザー招待ダイアログ */}
          <Dialog open={inviteDialogOpen} onClose={handleCloseInviteDialog} maxWidth="sm" fullWidth>
            <DialogTitle>ユーザーを招待</DialogTitle>
            <DialogContent>
              <DialogContentText paragraph>
                組織にユーザーを招待します。招待メールが送信されます。
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="メールアドレス"
                type="email"
                fullWidth
                variant="outlined"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                sx={{ mb: 3 }}
              />
              <FormControl fullWidth variant="outlined">
                <InputLabel>権限</InputLabel>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(Number(e.target.value))}
                  label="権限"
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseInviteDialog}>キャンセル</Button>
              <Button onClick={handleInviteUser} variant="contained" color="primary">
                招待する
              </Button>
            </DialogActions>
          </Dialog>

          {/* ユーザー権限編集ダイアログ */}
          <Dialog open={editUserDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
            <DialogTitle>ユーザー権限の編集</DialogTitle>
            <DialogContent>
              <DialogContentText paragraph>
                {selectedUser?.user.email} の権限を変更します。
              </DialogContentText>
              <FormControl fullWidth variant="outlined">
                <InputLabel>権限</InputLabel>
                <Select
                  value={editRole}
                  onChange={(e) => setEditRole(Number(e.target.value))}
                  label="権限"
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseEditDialog}>キャンセル</Button>
              <Button onClick={handleUpdateUserRole} variant="contained" color="primary">
                更新
              </Button>
            </DialogActions>
          </Dialog>

          {/* ユーザー削除確認ダイアログ */}
          <Dialog open={deleteUserDialogOpen} onClose={handleCloseDeleteDialog}>
            <DialogTitle>ユーザーを削除</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedUser?.user.email} をこの組織から削除しますか？
              </DialogContentText>
              <DialogContentText color="error" sx={{ mt: 2 }}>
                この操作は元に戻せません。ユーザーは組織からのみ削除され、アカウント自体は削除されません。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
              <Button onClick={handleRemoveUser} variant="contained" color="error">
                削除
              </Button>
            </DialogActions>
          </Dialog>

          {/* 招待キャンセル確認ダイアログ */}
          <Dialog open={deleteInviteDialogOpen} onClose={handleCloseDeleteInviteDialog}>
            <DialogTitle>招待をキャンセル</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedInvitation?.email} への招待をキャンセルしますか？
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteInviteDialog}>いいえ</Button>
              <Button onClick={handleCancelInvitation} variant="contained" color="error">
                はい、キャンセルします
              </Button>
            </DialogActions>
          </Dialog>

          {/* 招待再送信確認ダイアログ */}
          <Dialog open={resendDialogOpen} onClose={handleCloseResendDialog}>
            <DialogTitle>招待を再送信</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedInvitation?.email} へ招待メールを再送信しますか？
              </DialogContentText>
              <DialogContentText sx={{ mt: 2 }}>
                招待の有効期限が7日間延長されます。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseResendDialog}>キャンセル</Button>
              <Button onClick={handleResendInvitation} variant="contained" color="primary">
                再送信
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 