import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

type UserRole = {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'member';
  user: {
    email: string;
    user_metadata: {
      name?: string;
      avatar_url?: string;
    };
  };
};

export default function UserRoleManagement({ tenantId }: { tenantId: string }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          user:user_id (
            email,
            user_metadata
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setUsers((data || []) as any);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'owner' | 'admin' | 'member') => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setSuccess(true);
      fetchUsers();
    } catch (error) {
      console.error('権限更新エラー:', error);
      setError('権限の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setSuccess(true);
      fetchUsers();
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      setError('ユーザーの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        ユーザー権限管理
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mb: 2 }}>
          更新が完了しました
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザー</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((userRole) => (
              <TableRow key={userRole.id}>
                <TableCell>
                  {userRole.user.user_metadata?.name || '未設定'}
                </TableCell>
                <TableCell>{userRole.user.email}</TableCell>
                <TableCell>
                  <Select
                    value={userRole.role}
                    onChange={(e) => handleRoleChange(userRole.user_id, e.target.value as 'owner' | 'admin' | 'member')}
                    disabled={loading || userRole.user_id === user?.id}
                  >
                    <MenuItem value="owner">オーナー</MenuItem>
                    <MenuItem value="admin">管理者</MenuItem>
                    <MenuItem value="member">メンバー</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleRemoveUser(userRole.user_id)}
                    disabled={loading || userRole.user_id === user?.id}
                  >
                    削除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 