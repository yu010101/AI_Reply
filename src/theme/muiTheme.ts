import { createTheme, alpha } from '@mui/material/styles';

/**
 * Design Philosophy: "Quiet Confidence"
 *
 * A minimal, editorial design system inspired by high-end brands
 * and museum websites. Every element is calculated to convey
 * trust through restraint, not decoration.
 *
 * Color System: Monochromatic & Raw
 * - Canvas (White): #FFFFFF
 * - Ink (Text): #1A1A1A
 * - Concrete (Accent): #6B7280
 */

// Design Tokens
const tokens = {
  colors: {
    canvas: '#FFFFFF',
    ink: '#1A1A1A',
    concrete: '#6B7280',
    border: '#E5E7EB',
    muted: '#9CA3AF',
    // Functional colors (minimal saturation)
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#6B7280',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    lineHeight: 1.7,
  },
  transitions: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  radius: {
    sm: 2,
    md: 4,
    lg: 6,
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.colors.ink,
      light: tokens.colors.concrete,
      dark: '#000000',
      contrastText: tokens.colors.canvas,
    },
    secondary: {
      main: tokens.colors.concrete,
      light: tokens.colors.muted,
      dark: '#4B5563',
      contrastText: tokens.colors.canvas,
    },
    success: {
      main: tokens.colors.success,
      light: alpha(tokens.colors.success, 0.1),
      dark: '#047857',
      contrastText: tokens.colors.canvas,
    },
    warning: {
      main: tokens.colors.warning,
      light: alpha(tokens.colors.warning, 0.1),
      dark: '#B45309',
      contrastText: tokens.colors.canvas,
    },
    error: {
      main: tokens.colors.error,
      light: alpha(tokens.colors.error, 0.1),
      dark: '#B91C1C',
      contrastText: tokens.colors.canvas,
    },
    info: {
      main: tokens.colors.info,
      light: alpha(tokens.colors.info, 0.1),
      dark: '#4B5563',
      contrastText: tokens.colors.canvas,
    },
    background: {
      default: tokens.colors.canvas,
      paper: tokens.colors.canvas,
    },
    text: {
      primary: tokens.colors.ink,
      secondary: tokens.colors.concrete,
      disabled: tokens.colors.muted,
    },
    divider: tokens.colors.border,
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    // Display - Large headlines
    h1: {
      fontSize: '2.5rem',
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: tokens.colors.ink,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: tokens.colors.ink,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0',
      color: tokens.colors.ink,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 400,
      lineHeight: 1.4,
      color: tokens.colors.ink,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: tokens.colors.ink,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: tokens.colors.ink,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: tokens.colors.concrete,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: tokens.colors.concrete,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: tokens.typography.lineHeight,
      color: tokens.colors.ink,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: tokens.typography.lineHeight,
      color: tokens.colors.ink,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: tokens.colors.concrete,
      letterSpacing: '0.01em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: tokens.colors.muted,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: tokens.radius.md,
  },
  shadows: [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.ink,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': {
          backgroundColor: tokens.colors.ink,
          color: tokens.colors.canvas,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 400,
          borderRadius: tokens.radius.sm,
          padding: '10px 20px',
          transition: `all ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            transform: 'none',
          },
          '&:active': {
            transform: 'none',
          },
        },
        contained: {
          backgroundColor: tokens.colors.ink,
          color: tokens.colors.canvas,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#333333',
            boxShadow: 'none',
          },
          '&:active': {
            backgroundColor: '#000000',
          },
          '&.Mui-disabled': {
            backgroundColor: tokens.colors.border,
            color: tokens.colors.muted,
          },
        },
        outlined: {
          borderColor: tokens.colors.ink,
          color: tokens.colors.ink,
          borderWidth: '1px',
          '&:hover': {
            borderColor: tokens.colors.ink,
            backgroundColor: alpha(tokens.colors.ink, 0.04),
            borderWidth: '1px',
          },
        },
        text: {
          color: tokens.colors.ink,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.04),
          },
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '14px 28px',
          fontSize: '1rem',
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          transition: `background-color ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.04),
            transform: 'none',
          },
          '&:active': {
            transform: 'none',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.colors.border}`,
          boxShadow: 'none',
          transition: `border-color ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            borderColor: tokens.colors.concrete,
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: tokens.spacing.lg,
          '&:last-child': {
            paddingBottom: tokens.spacing.lg,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: tokens.colors.border,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          fontWeight: 400,
          transition: `all ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            transform: 'none',
          },
        },
        filled: {
          backgroundColor: alpha(tokens.colors.ink, 0.06),
          color: tokens.colors.ink,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.1),
          },
        },
        outlined: {
          borderColor: tokens.colors.border,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.02),
          },
        },
        clickable: {
          '&:active': {
            transform: 'none',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.radius.sm,
            transition: `border-color ${tokens.transitions.duration} ${tokens.transitions.easing}`,
            '& fieldset': {
              borderColor: tokens.colors.border,
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: tokens.colors.concrete,
            },
            '&.Mui-focused fieldset': {
              borderColor: tokens.colors.ink,
              borderWidth: '1px',
            },
          },
          '& .MuiInputLabel-root': {
            color: tokens.colors.concrete,
            '&.Mui-focused': {
              color: tokens.colors.ink,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: tokens.radius.sm,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          boxShadow: 'none',
          border: `1px solid ${tokens.colors.border}`,
        },
        standardSuccess: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.success,
          borderColor: alpha(tokens.colors.success, 0.3),
          '& .MuiAlert-icon': {
            color: tokens.colors.success,
          },
        },
        standardError: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.error,
          borderColor: alpha(tokens.colors.error, 0.3),
          '& .MuiAlert-icon': {
            color: tokens.colors.error,
          },
        },
        standardWarning: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.warning,
          borderColor: alpha(tokens.colors.warning, 0.3),
          '& .MuiAlert-icon': {
            color: tokens.colors.warning,
          },
        },
        standardInfo: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.ink,
          borderColor: tokens.colors.border,
          '& .MuiAlert-icon': {
            color: tokens.colors.concrete,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.md,
          boxShadow: `0 0 0 1px ${tokens.colors.border}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 400,
          padding: tokens.spacing.lg,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: tokens.spacing.lg,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: tokens.spacing.lg,
          gap: tokens.spacing.sm,
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 400,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: tokens.colors.muted,
            borderBottom: `1px solid ${tokens.colors.border}`,
            padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            '&:hover': {
              backgroundColor: alpha(tokens.colors.ink, 0.02),
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${tokens.colors.border}`,
          padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
          color: tokens.colors.ink,
        },
      },
    },
    MuiListItemButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          margin: `${tokens.spacing.xs}px 0`,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          transition: `background-color ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.04),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(tokens.colors.ink, 0.06),
            '&:hover': {
              backgroundColor: alpha(tokens.colors.ink, 0.08),
            },
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tokens.colors.border,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          backgroundColor: tokens.colors.ink,
          height: 1,
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 400,
          fontSize: '0.875rem',
          minHeight: 40,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          color: tokens.colors.concrete,
          transition: `color ${tokens.transitions.duration} ${tokens.transitions.easing}`,
          '&:hover': {
            color: tokens.colors.ink,
          },
          '&.Mui-selected': {
            color: tokens.colors.ink,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 1,
          backgroundColor: tokens.colors.border,
          height: 2,
        },
        bar: {
          borderRadius: 1,
          backgroundColor: tokens.colors.ink,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: tokens.colors.ink,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(tokens.colors.ink, 0.04),
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.colors.ink,
          color: tokens.colors.canvas,
          fontSize: '0.75rem',
          fontWeight: 400,
          padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
          borderRadius: tokens.radius.sm,
        },
        arrow: {
          color: tokens.colors.ink,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 400,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(tokens.colors.ink, 0.08),
          color: tokens.colors.ink,
          fontWeight: 400,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
        },
        switchBase: {
          '&.Mui-checked': {
            color: tokens.colors.canvas,
            '& + .MuiSwitch-track': {
              backgroundColor: tokens.colors.ink,
              opacity: 1,
            },
          },
        },
        track: {
          borderRadius: 10,
          backgroundColor: tokens.colors.border,
          opacity: 1,
        },
        thumb: {
          boxShadow: 'none',
        },
      },
    },
    MuiCheckbox: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          color: tokens.colors.border,
          '&.Mui-checked': {
            color: tokens.colors.ink,
          },
        },
      },
    },
    MuiRadio: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          color: tokens.colors.border,
          '&.Mui-checked': {
            color: tokens.colors.ink,
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.sm,
          boxShadow: `0 0 0 1px ${tokens.colors.border}`,
          marginTop: tokens.spacing.xs,
        },
      },
    },
    MuiMenuItem: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          '&:hover': {
            backgroundColor: alpha(tokens.colors.ink, 0.04),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(tokens.colors.ink, 0.06),
            '&:hover': {
              backgroundColor: alpha(tokens.colors.ink, 0.08),
            },
          },
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        separator: {
          color: tokens.colors.muted,
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          '& .MuiPaginationItem-root': {
            borderRadius: tokens.radius.sm,
            '&.Mui-selected': {
              backgroundColor: tokens.colors.ink,
              color: tokens.colors.canvas,
              '&:hover': {
                backgroundColor: '#333333',
              },
            },
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: tokens.radius.sm,
            boxShadow: `0 0 0 1px ${tokens.colors.border}`,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${tokens.colors.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.colors.canvas,
          color: tokens.colors.ink,
          boxShadow: 'none',
          borderBottom: `1px solid ${tokens.colors.border}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px !important',
        },
      },
    },
  },
});

// Export design tokens for use in custom components
export { tokens };
export default theme;
