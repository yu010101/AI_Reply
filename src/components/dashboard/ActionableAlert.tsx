import { Box, Alert, AlertTitle, Button, Chip, IconButton, Collapse } from '@mui/material';
import { ReactNode, useState } from 'react';
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
}: ActionableAlertProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) return null;

  return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        icon={icon}
        action={
          dismissible ? (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setOpen(false)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : null
        }
        sx={{
          mb: 2,
          '& .MuiAlert-message': {
            width: '100%',
          },
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <AlertTitle sx={{ mb: 0, fontWeight: 600 }}>{title}</AlertTitle>
            {badge !== undefined && (
              <Chip
                label={badge}
                size="small"
                color={severity}
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Box sx={{ mb: actions.length > 0 ? 1.5 : 0 }}>{message}</Box>
          {actions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
