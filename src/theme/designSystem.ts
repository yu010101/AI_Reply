/**
 * RevAI Concierge - World-Class Design System
 *
 * "Clarity Through Simplicity"
 *
 * Design Principles:
 * 1. Instant Clarity - Users understand in 0.1 seconds
 * 2. Zero Friction - Every action feels effortless
 * 3. Delightful Feedback - Every interaction rewards the user
 * 4. Accessible First - Works for everyone, everywhere
 * 5. Performance is UX - Fast is beautiful
 */

// =============================================================================
// COLOR SYSTEM
// =============================================================================

export const colors = {
  // Primary Palette - Monochromatic with purpose
  canvas: '#FFFFFF',      // Pure white background
  ink: '#0F172A',         // Deep slate for primary text (better contrast)
  secondary: '#475569',   // Slate for secondary text
  muted: '#94A3B8',       // Muted text, placeholders
  border: '#E2E8F0',      // Subtle borders
  surface: '#F8FAFC',     // Elevated surfaces, cards hover

  // Interactive States
  interactive: {
    default: '#0F172A',
    hover: '#1E293B',
    active: '#334155',
    disabled: '#CBD5E1',
  },

  // Semantic Colors - Used sparingly for meaning
  semantic: {
    success: {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#047857',
      icon: '#10B981',
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#B45309',
      icon: '#F59E0B',
    },
    error: {
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#B91C1C',
      icon: '#EF4444',
    },
    info: {
      bg: '#F0F9FF',
      border: '#BAE6FD',
      text: '#0369A1',
      icon: '#0EA5E9',
    },
  },

  // Rating Stars
  rating: {
    filled: '#FBBF24',    // Amber for filled stars
    empty: '#E2E8F0',     // Light gray for empty
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // Font Sizes with line heights
  sizes: {
    xs: { fontSize: '0.75rem', lineHeight: 1.5 },      // 12px - Captions
    sm: { fontSize: '0.875rem', lineHeight: 1.5 },     // 14px - Body small
    base: { fontSize: '1rem', lineHeight: 1.6 },       // 16px - Body
    lg: { fontSize: '1.125rem', lineHeight: 1.5 },     // 18px - Body large
    xl: { fontSize: '1.25rem', lineHeight: 1.4 },      // 20px - H4
    '2xl': { fontSize: '1.5rem', lineHeight: 1.35 },   // 24px - H3
    '3xl': { fontSize: '1.875rem', lineHeight: 1.3 },  // 30px - H2
    '4xl': { fontSize: '2.25rem', lineHeight: 1.2 },   // 36px - H1
    '5xl': { fontSize: '3rem', lineHeight: 1.1 },      // 48px - Display
  },

  // Font Weights - Only 2 weights for clarity
  weights: {
    normal: 400,
    medium: 500,
  },

  // Letter Spacing
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// =============================================================================
// SPACING SYSTEM (8px base)
// =============================================================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  8: '2rem',         // 32px
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
} as const;

// =============================================================================
// ANIMATION & TRANSITIONS
// =============================================================================

export const animation = {
  // Duration
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Common transitions
  transition: {
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color 150ms, background-color 150ms, border-color 150ms',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const borders = {
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    full: '9999px',
  },

  width: {
    none: '0',
    thin: '1px',
    thick: '2px',
  },
} as const;

// =============================================================================
// SHADOWS (Minimal, purposeful)
// =============================================================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  // Focus ring
  focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
  focusError: '0 0 0 2px #FFFFFF, 0 0 0 4px #EF4444',
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

export const layout = {
  headerHeight: 64,
  sidebarWidth: 256,
  sidebarCollapsedWidth: 72,
  maxContentWidth: 1280,
  containerPadding: {
    mobile: 16,
    tablet: 24,
    desktop: 32,
  },
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const components = {
  // Button variants
  button: {
    base: {
      fontWeight: typography.weights.medium,
      fontSize: typography.sizes.sm.fontSize,
      borderRadius: borders.radius.md,
      transition: animation.transition.all,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
    },
    sizes: {
      sm: { height: '32px', padding: `0 ${spacing[3]}` },
      md: { height: '40px', padding: `0 ${spacing[4]}` },
      lg: { height: '48px', padding: `0 ${spacing[6]}` },
    },
    variants: {
      primary: {
        background: colors.ink,
        color: colors.canvas,
        '&:hover': { background: colors.interactive.hover },
        '&:active': { background: colors.interactive.active },
        '&:focus-visible': { boxShadow: shadows.focus },
        '&:disabled': {
          background: colors.interactive.disabled,
          cursor: 'not-allowed',
        },
      },
      secondary: {
        background: 'transparent',
        color: colors.ink,
        border: `1px solid ${colors.border}`,
        '&:hover': { background: colors.surface, borderColor: colors.secondary },
        '&:active': { background: colors.border },
        '&:focus-visible': { boxShadow: shadows.focus },
      },
      ghost: {
        background: 'transparent',
        color: colors.secondary,
        '&:hover': { background: colors.surface, color: colors.ink },
        '&:active': { background: colors.border },
        '&:focus-visible': { boxShadow: shadows.focus },
      },
    },
  },

  // Input styles
  input: {
    base: {
      fontSize: typography.sizes.base.fontSize,
      lineHeight: typography.sizes.base.lineHeight,
      borderRadius: borders.radius.md,
      border: `1px solid ${colors.border}`,
      background: colors.canvas,
      color: colors.ink,
      transition: animation.transition.colors,
      '&::placeholder': { color: colors.muted },
      '&:hover': { borderColor: colors.secondary },
      '&:focus': {
        borderColor: colors.ink,
        outline: 'none',
        boxShadow: shadows.focus,
      },
      '&:disabled': {
        background: colors.surface,
        cursor: 'not-allowed',
      },
    },
    sizes: {
      sm: { height: '36px', padding: `0 ${spacing[3]}` },
      md: { height: '44px', padding: `0 ${spacing[4]}` },
      lg: { height: '52px', padding: `0 ${spacing[5]}` },
    },
  },

  // Card styles
  card: {
    base: {
      background: colors.canvas,
      borderRadius: borders.radius.lg,
      border: `1px solid ${colors.border}`,
      padding: spacing[6],
      transition: animation.transition.all,
    },
    interactive: {
      cursor: 'pointer',
      '&:hover': {
        borderColor: colors.secondary,
        background: colors.surface,
      },
      '&:focus-visible': {
        boxShadow: shadows.focus,
        outline: 'none',
      },
    },
  },

  // Badge/Tag styles
  badge: {
    base: {
      fontSize: typography.sizes.xs.fontSize,
      fontWeight: typography.weights.medium,
      borderRadius: borders.radius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
    },
  },
} as const;

// =============================================================================
// ACCESSIBILITY
// =============================================================================

export const a11y = {
  // Minimum touch target size
  minTouchTarget: 44,

  // Focus visible styles
  focusVisible: {
    outline: 'none',
    boxShadow: shadows.focus,
  },

  // Screen reader only
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  },
} as const;

// =============================================================================
// TOAST/NOTIFICATION SETTINGS
// =============================================================================

export const notifications = {
  duration: {
    success: 3000,
    info: 5000,
    warning: 7000,
    error: 0, // Persist until dismissed
  },
  position: 'bottom-right',
} as const;

// =============================================================================
// EXPORT ALL
// =============================================================================

export const designSystem = {
  colors,
  typography,
  spacing,
  animation,
  borders,
  shadows,
  zIndex,
  breakpoints,
  layout,
  components,
  a11y,
  notifications,
} as const;

export default designSystem;
