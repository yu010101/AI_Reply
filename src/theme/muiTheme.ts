import { createTheme, alpha } from '@mui/material/styles';

/**
 * RevAI Concierge - World-Class MUI Theme
 *
 * "Clarity Through Simplicity"
 *
 * Design Principles:
 * 1. Instant Clarity - Users understand in 0.1 seconds
 * 2. Zero Friction - Every action feels effortless
 * 3. Delightful Feedback - Every interaction rewards the user
 * 4. Accessible First - Works for everyone, everywhere
 */

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export const tokens = {
  colors: {
    // Primary Palette
    canvas: '#FFFFFF',
    ink: '#0F172A',         // Deep slate - better contrast
    secondary: '#475569',   // Slate 600
    muted: '#94A3B8',       // Slate 400
    border: '#E2E8F0',      // Slate 200
    surface: '#F8FAFC',     // Slate 50

    // Semantic Colors
    success: '#059669',     // Emerald 600
    successLight: '#ECFDF5',
    warning: '#D97706',     // Amber 600
    warningLight: '#FFFBEB',
    error: '#DC2626',       // Red 600
    errorLight: '#FEF2F2',
    info: '#0284C7',        // Sky 600
    infoLight: '#F0F9FF',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
  },

  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    full: 9999,
  },

  shadows: {
    focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
    focusError: '0 0 0 2px #FFFFFF, 0 0 0 4px #DC2626',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
};

// =============================================================================
// THEME CREATION
// =============================================================================

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.colors.ink,
      light: tokens.colors.secondary,
      dark: '#020617',
      contrastText: tokens.colors.canvas,
    },
    secondary: {
      main: tokens.colors.secondary,
      light: tokens.colors.muted,
      dark: '#334155',
      contrastText: tokens.colors.canvas,
    },
    success: {
      main: tokens.colors.success,
      light: tokens.colors.successLight,
      dark: '#047857',
      contrastText: tokens.colors.canvas,
    },
    warning: {
      main: tokens.colors.warning,
      light: tokens.colors.warningLight,
      dark: '#B45309',
      contrastText: tokens.colors.canvas,
    },
    error: {
      main: tokens.colors.error,
      light: tokens.colors.errorLight,
      dark: '#B91C1C',
      contrastText: tokens.colors.canvas,
    },
    info: {
      main: tokens.colors.info,
      light: tokens.colors.infoLight,
      dark: '#0369A1',
      contrastText: tokens.colors.canvas,
    },
    background: {
      default: tokens.colors.canvas,
      paper: tokens.colors.canvas,
    },
    text: {
      primary: tokens.colors.ink,
      secondary: tokens.colors.secondary,
      disabled: tokens.colors.muted,
    },
    divider: tokens.colors.border,
    action: {
      hover: alpha(tokens.colors.ink, 0.04),
      selected: alpha(tokens.colors.ink, 0.08),
      disabled: tokens.colors.muted,
      disabledBackground: tokens.colors.border,
    },
  },

  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: {
      fontSize: '2.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      color: tokens.colors.ink,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: tokens.colors.ink,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.35,
      letterSpacing: '-0.015em',
      color: tokens.colors.ink,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: tokens.colors.ink,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: tokens.colors.ink,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: tokens.colors.ink,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: tokens.colors.secondary,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: tokens.colors.secondary,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: tokens.colors.ink,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      color: tokens.colors.ink,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: tokens.colors.secondary,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: tokens.colors.muted,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: tokens.radius.sm,
  },

  shadows: [
    'none',
    tokens.shadows.sm,
    tokens.shadows.sm,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
  ],

  components: {
    // ==========================================================================
    // GLOBAL BASELINE
    // ==========================================================================
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
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
        // Focus visible for accessibility
        ':focus-visible': {
          outline: 'none',
          boxShadow: tokens.shadows.focus,
        },
      },
    },

    // ==========================================================================
    // BUTTONS - Delightful micro-interactions
    // ==========================================================================
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: tokens.radius.sm,
          padding: '10px 20px',
          minHeight: 44, // Accessibility: minimum touch target
          transition: `all ${tokens.animation.fast} ${tokens.animation.easing}`,
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
        contained: {
          backgroundColor: tokens.colors.ink,
          color: tokens.colors.canvas,
          '&:hover': {
            backgroundColor: '#1E293B',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            backgroundColor: '#334155',
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            backgroundColor: tokens.colors.border,
            color: tokens.colors.muted,
          },
        },
        outlined: {
          borderColor: tokens.colors.border,
          color: tokens.colors.ink,
          borderWidth: '1px',
          '&:hover': {
            borderColor: tokens.colors.secondary,
            backgroundColor: tokens.colors.surface,
            borderWidth: '1px',
          },
          '&:active': {
            backgroundColor: tokens.colors.border,
          },
        },
        text: {
          color: tokens.colors.ink,
          '&:hover': {
            backgroundColor: tokens.colors.surface,
          },
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8125rem',
          minHeight: 36,
        },
        sizeLarge: {
          padding: '14px 28px',
          fontSize: '1rem',
          minHeight: 52,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          transition: `all ${tokens.animation.fast} ${tokens.animation.easing}`,
          '&:hover': {
            backgroundColor: tokens.colors.surface,
          },
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
      },
    },

    // ==========================================================================
    // CARDS - Clean, purposeful elevation
    // ==========================================================================
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border}`,
          transition: `all ${tokens.animation.normal} ${tokens.animation.easing}`,
          '&:hover': {
            borderColor: tokens.colors.secondary,
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

    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
      },
    },

    // ==========================================================================
    // INPUTS - Clear feedback states
    // ==========================================================================
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.radius.sm,
            transition: `all ${tokens.animation.fast} ${tokens.animation.easing}`,
            '& fieldset': {
              borderColor: tokens.colors.border,
              borderWidth: '1px',
              transition: `border-color ${tokens.animation.fast} ${tokens.animation.easing}`,
            },
            '&:hover fieldset': {
              borderColor: tokens.colors.secondary,
            },
            '&.Mui-focused fieldset': {
              borderColor: tokens.colors.ink,
              borderWidth: '2px',
            },
            '&.Mui-error fieldset': {
              borderColor: tokens.colors.error,
            },
          },
          '& .MuiInputLabel-root': {
            color: tokens.colors.secondary,
            '&.Mui-focused': {
              color: tokens.colors.ink,
            },
            '&.Mui-error': {
              color: tokens.colors.error,
            },
          },
          '& .MuiFormHelperText-root': {
            marginLeft: 0,
            marginTop: tokens.spacing.xs,
          },
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: '2px',
            },
          },
        },
        input: {
          '&::placeholder': {
            color: tokens.colors.muted,
            opacity: 1,
          },
        },
      },
    },

    // ==========================================================================
    // ALERTS - Semantic colors with clear hierarchy
    // ==========================================================================
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
          alignItems: 'flex-start',
        },
        standardSuccess: {
          backgroundColor: tokens.colors.successLight,
          color: '#047857',
          border: `1px solid #A7F3D0`,
          '& .MuiAlert-icon': {
            color: tokens.colors.success,
          },
        },
        standardError: {
          backgroundColor: tokens.colors.errorLight,
          color: '#B91C1C',
          border: `1px solid #FECACA`,
          '& .MuiAlert-icon': {
            color: tokens.colors.error,
          },
        },
        standardWarning: {
          backgroundColor: tokens.colors.warningLight,
          color: '#B45309',
          border: `1px solid #FDE68A`,
          '& .MuiAlert-icon': {
            color: tokens.colors.warning,
          },
        },
        standardInfo: {
          backgroundColor: tokens.colors.infoLight,
          color: '#0369A1',
          border: `1px solid #BAE6FD`,
          '& .MuiAlert-icon': {
            color: tokens.colors.info,
          },
        },
      },
    },

    // ==========================================================================
    // DIALOG - Focused attention
    // ==========================================================================
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.lg,
          boxShadow: tokens.shadows.md,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 500,
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing.md,
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: tokens.spacing.lg,
          paddingTop: `${tokens.spacing.md}px !important`,
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.sm,
        },
      },
    },

    // ==========================================================================
    // TABLES - Scannable data
    // ==========================================================================
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: tokens.colors.secondary,
            backgroundColor: tokens.colors.surface,
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
            transition: `background-color ${tokens.animation.fast} ${tokens.animation.easing}`,
            '&:hover': {
              backgroundColor: tokens.colors.surface,
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
        },
      },
    },

    // ==========================================================================
    // CHIPS/BADGES - Visual categorization
    // ==========================================================================
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.full,
          fontWeight: 500,
          fontSize: '0.75rem',
          height: 28,
        },
        filled: {
          backgroundColor: tokens.colors.surface,
          color: tokens.colors.ink,
          '&:hover': {
            backgroundColor: tokens.colors.border,
          },
        },
        outlined: {
          borderColor: tokens.colors.border,
        },
      },
    },

    // ==========================================================================
    // NAVIGATION - Clear wayfinding
    // ==========================================================================
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          backgroundColor: tokens.colors.ink,
          height: 2,
          borderRadius: 1,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 44,
          minWidth: 'auto',
          padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
          color: tokens.colors.secondary,
          transition: `color ${tokens.animation.fast} ${tokens.animation.easing}`,
          '&:hover': {
            color: tokens.colors.ink,
          },
          '&.Mui-selected': {
            color: tokens.colors.ink,
          },
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.sm,
          margin: `${tokens.spacing.xs}px 0`,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          minHeight: 44,
          transition: `all ${tokens.animation.fast} ${tokens.animation.easing}`,
          '&:hover': {
            backgroundColor: tokens.colors.surface,
          },
          '&.Mui-selected': {
            backgroundColor: tokens.colors.surface,
            '&:hover': {
              backgroundColor: tokens.colors.border,
            },
          },
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
      },
    },

    // ==========================================================================
    // PROGRESS - Visual feedback
    // ==========================================================================
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.border,
          height: 4,
        },
        bar: {
          borderRadius: tokens.radius.full,
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
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.sm,
        },
        rectangular: {
          borderRadius: tokens.radius.sm,
        },
      },
    },

    // ==========================================================================
    // TOOLTIPS - Contextual help
    // ==========================================================================
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.colors.ink,
          color: tokens.colors.canvas,
          fontSize: '0.8125rem',
          fontWeight: 400,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          borderRadius: tokens.radius.sm,
          boxShadow: tokens.shadows.md,
        },
        arrow: {
          color: tokens.colors.ink,
        },
      },
    },

    // ==========================================================================
    // SNACKBAR/TOAST - Feedback notifications
    // ==========================================================================
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: tokens.radius.sm,
            boxShadow: tokens.shadows.md,
          },
        },
      },
    },

    // ==========================================================================
    // LAYOUT COMPONENTS
    // ==========================================================================
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

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tokens.colors.border,
        },
      },
    },

    // ==========================================================================
    // FORM CONTROLS
    // ==========================================================================
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
          '& .MuiSwitch-track': {
            borderRadius: tokens.radius.full,
            backgroundColor: tokens.colors.border,
            opacity: 1,
          },
          '& .MuiSwitch-thumb': {
            boxShadow: tokens.shadows.sm,
          },
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              color: tokens.colors.canvas,
              '& + .MuiSwitch-track': {
                backgroundColor: tokens.colors.success,
                opacity: 1,
              },
            },
          },
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: tokens.colors.border,
          '&.Mui-checked': {
            color: tokens.colors.ink,
          },
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          color: tokens.colors.border,
          '&.Mui-checked': {
            color: tokens.colors.ink,
          },
          '&:focus-visible': {
            boxShadow: tokens.shadows.focus,
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

    // ==========================================================================
    // MENUS
    // ==========================================================================
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.md,
          boxShadow: tokens.shadows.md,
          border: `1px solid ${tokens.colors.border}`,
          marginTop: tokens.spacing.xs,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          minHeight: 40,
          transition: `background-color ${tokens.animation.fast} ${tokens.animation.easing}`,
          '&:hover': {
            backgroundColor: tokens.colors.surface,
          },
          '&.Mui-selected': {
            backgroundColor: tokens.colors.surface,
            '&:hover': {
              backgroundColor: tokens.colors.border,
            },
          },
        },
      },
    },

    // ==========================================================================
    // AVATAR
    // ==========================================================================
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.colors.surface,
          color: tokens.colors.ink,
          fontWeight: 500,
          border: `1px solid ${tokens.colors.border}`,
        },
      },
    },

    // ==========================================================================
    // PAGINATION
    // ==========================================================================
    MuiPagination: {
      styleOverrides: {
        root: {
          '& .MuiPaginationItem-root': {
            borderRadius: tokens.radius.sm,
            minWidth: 36,
            height: 36,
            '&.Mui-selected': {
              backgroundColor: tokens.colors.ink,
              color: tokens.colors.canvas,
              '&:hover': {
                backgroundColor: '#1E293B',
              },
            },
            '&:focus-visible': {
              boxShadow: tokens.shadows.focus,
            },
          },
        },
      },
    },

    // ==========================================================================
    // BREADCRUMBS
    // ==========================================================================
    MuiBreadcrumbs: {
      styleOverrides: {
        separator: {
          color: tokens.colors.muted,
        },
        li: {
          '& a': {
            color: tokens.colors.secondary,
            textDecoration: 'none',
            transition: `color ${tokens.animation.fast} ${tokens.animation.easing}`,
            '&:hover': {
              color: tokens.colors.ink,
            },
          },
        },
      },
    },

    // ==========================================================================
    // BADGE
    // ==========================================================================
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
