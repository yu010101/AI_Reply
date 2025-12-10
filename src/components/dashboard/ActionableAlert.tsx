/**
 * World-Class ActionableAlert Component
 *
 * Design Principles:
 * - Clear visual hierarchy
 * - Actionable with prominent CTAs
 * - Accessible dismissal
 * - Consistent with design system
 */

import { Box, Alert, AlertTitle, Button, Chip, IconButton, Collapse } from '@mui/material';
import { ReactNode, useState, useCallback } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export type AlertAction = {
  label: string;
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
};

interface ActionableAlertProps {
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  icon?: ReactNode;
  badge?: string | number;
  actions?: AlertAction[];
  dismissible?: boolean;
  defaultOpen?: boolean;
  onDismiss?: () => void;
}

export default function ActionableAlert({
  severity,
  title,
  message,
  icon,
  badge,
  actions = [],
  dismissible = true,
  defaultOpen = true,
  onDismiss,
}: ActionableAlertProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!open) return null;

  return (
    <Collapse in={open} timeout={200}>
      <Alert
        severity={severity}
        icon={icon}
        role="alert"
        action={
          dismissible ? (
            <IconButton
              aria-label="アラートを閉じる"
              color="inherit"
              size="small"
              onClick={handleDismiss}
              sx={{
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                },
                '&:focus-visible': {
                  boxShadow: '0 0 0 2px currentColor',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null
        }
        sx={{
          mb: 2,
          borderRadius: 2,
          alignItems: 'flex-start',
          '& .MuiAlert-message': {
            width: '100%',
            py: 0.5,
          },
          '& .MuiAlert-icon': {
            py: 1,
          },
        }}
      >
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <AlertTitle
              sx={{
                mb: 0,
                fontWeight: 500,
                fontSize: '0.9375rem',
              }}
            >
              {title}
            </AlertTitle>
            {badge !== undefined && (
              <Chip
                label={badge}
                size="small"
                color={severity}
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              />
            )}
          </Box>

          {/* Message */}
          <Box
            sx={{
              mb: actions.length > 0 ? 2 : 0,
              fontSize: '0.875rem',
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            {message}
          </Box>

          {/* Actions */}
          {actions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outlined'}
                  color={action.color || severity}
                  size="small"
                  onClick={action.onClick}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    minHeight: 36,
                    borderRadius: 1.5,
                    '&:focus-visible': {
                      boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px currentColor',
                    },
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </Alert>
    </Collapse>
  );
}
