import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

type Role = 'owner' | 'admin' | 'member';

export default function UserInvitation({ tenantId }: { tenantId: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/tenants/${tenantId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          role,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '招待に失敗しました');
      }

      setSuccess(true);
      setEmail('');
      setRole('member');
    } catch (error) {
      console.error('招待エラー:', error);
      setError(error instanceof Error ? error.message : 'ユーザーの招待に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        ユーザー招待
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mb: 2 }}>
          招待メールを送信しました
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>権限</InputLabel>
          <Select
            value={role}
            label="権限"
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <MenuItem value="owner">オーナー</MenuItem>
            <MenuItem value="admin">管理者</MenuItem>
            <MenuItem value="member">メンバー</MenuItem>
          </Select>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : '招待する'}
        </Button>
      </Box>
    </Box>
  );
} 