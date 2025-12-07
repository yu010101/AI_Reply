import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Alert, AlertProps, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toastVariants } from '@/utils/animations';

export interface ToastProps {
  id: string;
  message: string;
  severity?: AlertProps['severity'];
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast Notification Component
 * Animated toast with slide-in effect
 */
export default function Toast({
  id,
  message,
  severity = 'info',
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ marginBottom: 8 }}
        >
          <Alert
            severity={severity}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            sx={{
              boxShadow: 3,
              minWidth: 300,
            }}
          >
            {message}
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
