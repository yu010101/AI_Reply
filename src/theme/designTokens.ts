/**
 * Design Tokens
 *
 * "Quiet Confidence" Design System
 *
 * A monochromatic, editorial design system inspired by
 * high-end brands and museum websites.
 *
 * Philosophy:
 * - "Subtract before adding" - Remove before you add
 * - White space is a design element
 * - Typography creates hierarchy, not decoration
 * - No gradients, no shadows, no decorative elements
 */

export const tokens = {
  /**
   * Color System: Monochromatic & Raw
   *
   * Use only these 3 core colors plus minimal functional colors.
   * Gray backgrounds for section separation are PROHIBITED.
   */
  colors: {
    // Core Palette (Primary use)
    canvas: '#FFFFFF',    // Background - always white
    ink: '#1A1A1A',       // Primary text - not pure black for readability
    concrete: '#6B7280',  // Secondary text, borders, accents

    // Supporting (Limited use)
    border: '#E5E7EB',    // Subtle borders, dividers
    muted: '#9CA3AF',     // Disabled states, hints

    // Functional (Only for semantic meaning)
    success: '#059669',   // Emerald - success states only
    warning: '#D97706',   // Amber - warnings only
    error: '#DC2626',     // Red - errors only
    info: '#6B7280',      // Same as concrete - info messages
  },

  /**
   * Typography: Swiss Style
   *
   * Font: Inter (or Helvetica Neue fallback)
   * Weight: Primarily 400 (Regular), 500 sparingly
   * Bold (700) usage = "lack of confidence" - avoid
   */
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),

    fontWeight: {
      regular: 400,
      medium: 500,  // Use sparingly for emphasis
    },

    fontSize: {
      xs: '0.75rem',      // 12px - Captions, metadata
      sm: '0.875rem',     // 14px - Secondary text
      base: '1rem',       // 16px - Body text
      lg: '1.125rem',     // 18px - Emphasized body
      xl: '1.25rem',      // 20px - Small headings
      '2xl': '1.5rem',    // 24px - Section headings
      '3xl': '2rem',      // 32px - Page headings
      '4xl': '2.5rem',    // 40px - Hero headings
    },

    lineHeight: {
      tight: 1.2,         // Headlines
      snug: 1.4,          // Subheadings
      normal: 1.7,        // Body text
      relaxed: 1.8,       // Long-form reading
    },

    letterSpacing: {
      tight: '-0.02em',   // Large headlines
      snug: '-0.01em',    // Medium headlines
      normal: '0',        // Body text
      wide: '0.05em',     // Table headers
      wider: '0.08em',    // Overlines, labels
    },

    // Maximum characters per line for optimal readability
    maxWidth: '65ch',
  },

  /**
   * Spacing: Breathable
   *
   * "White space is not empty space - it's a design element"
   * Use generous spacing. When in doubt, add more.
   */
  spacing: {
    xs: 4,      // 4px
    sm: 8,      // 8px
    md: 16,     // 16px
    lg: 24,     // 24px
    xl: 32,     // 32px
    xxl: 48,    // 48px
    xxxl: 64,   // 64px

    // Component-specific
    sectionGap: 64,       // Between major sections
    cardPadding: 24,      // Inside cards
    buttonPadding: '10px 20px',
    inputPadding: '12px 16px',
  },

  /**
   * Border Radius: Minimal
   *
   * No pill shapes. No rounded corners > 6px.
   */
  radius: {
    sm: 2,      // Buttons, inputs
    md: 4,      // Cards, dialogs
    lg: 6,      // Maximum for any element
  },

  /**
   * Shadows: NONE
   *
   * Shadows are PROHIBITED in this design system.
   * Use borders for elevation instead.
   */
  shadows: {
    none: 'none',
    // If absolutely necessary (dialogs only):
    subtle: '0 0 0 1px #E5E7EB',
  },

  /**
   * Transitions: Subtle
   *
   * Animations should be barely noticeable.
   * No bouncy, elastic, or attention-grabbing effects.
   */
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
  },
} as const;

/**
 * Design Rules (MUST follow)
 *
 * 1. COLORS
 *    - Background: Always #FFFFFF (white)
 *    - NO gray backgrounds for section separation
 *    - NO gradients of any kind
 *    - NO colored backgrounds except for functional states
 *
 * 2. TYPOGRAPHY
 *    - Weight: Use Regular (400) as default
 *    - NO Bold (700) - use size/spacing for emphasis instead
 *    - Heading size progression creates hierarchy
 *    - Max line width: 65 characters
 *
 * 3. BUTTONS
 *    - Primary: #1A1A1A background + white text
 *    - Secondary: 1px #1A1A1A border + transparent
 *    - NO box-shadow
 *    - NO gradient
 *    - NO transform on hover (subtle bg change only)
 *
 * 4. CARDS
 *    - 1px border only (#E5E7EB)
 *    - NO elevation/shadow
 *    - NO hover shadow
 *    - Hover: border color change only
 *
 * 5. ICONS
 *    - Lucide Icons preferred
 *    - Stroke width: 1.5-2px (consistent)
 *    - NO filled icons
 *
 * 6. TABLES
 *    - NO vertical borders
 *    - Horizontal borders: #E5E7EB or whitespace only
 *    - Headers: Uppercase, 0.75rem, #9CA3AF
 *
 * 7. ANIMATIONS
 *    - Duration: 150-200ms max
 *    - Opacity and color transitions only
 *    - NO scale, bounce, or elastic effects
 *    - prefers-reduced-motion must be respected
 *
 * 8. SPACING
 *    - Use 1.5-2x normal spacing
 *    - Padding/margin should "breathe"
 *    - Section gaps: minimum 48px
 */

export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type RadiusToken = keyof typeof tokens.radius;

export default tokens;
