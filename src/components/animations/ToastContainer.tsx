import { Box } from '@mui/material';
import Toast from './Toast';
import { Toast as ToastType } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

/**
 * Toast Container Component
 * Manages multiple toast notifications
 */
export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </Box>
  );
}
