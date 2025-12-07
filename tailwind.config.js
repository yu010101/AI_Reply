/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/styles/**/*.css',
  ],
  theme: {
    extend: {
      /**
       * Design Philosophy: "Quiet Confidence"
       *
       * Monochromatic color system with minimal functional colors.
       * No gradients, no shadows, no decorative elements.
       */
      colors: {
        // Core Palette
        canvas: '#FFFFFF',
        ink: '#1A1A1A',
        concrete: '#6B7280',
        border: '#E5E7EB',
        muted: '#9CA3AF',

        // Functional (minimal saturation)
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },

      fontSize: {
        // Swiss Style typography scale
        xs: ['0.75rem', { lineHeight: '1.5' }],
        sm: ['0.875rem', { lineHeight: '1.6' }],
        base: ['1rem', { lineHeight: '1.7' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '4xl': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },

      fontWeight: {
        // Minimal weight usage - regular is primary
        normal: '400',
        medium: '500', // Use sparingly
      },

      spacing: {
        // Breathable spacing system
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },

      borderRadius: {
        // Minimal border radius
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
      },

      boxShadow: {
        // No decorative shadows - only functional
        none: 'none',
      },

      transitionDuration: {
        DEFAULT: '200ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      maxWidth: {
        prose: '65ch', // Optimal reading width
      },

      letterSpacing: {
        tight: '-0.02em',
        snug: '-0.01em',
        wide: '0.05em',
        wider: '0.08em',
      },
    },
  },
  plugins: [],
  // Disable unused utilities to keep bundle minimal
  corePlugins: {
    // Disable gradient utilities
    backgroundImage: false,
    gradientColorStops: false,
    // Disable ring utilities (use border instead)
    ringColor: false,
    ringOffsetColor: false,
    ringOffsetWidth: false,
    ringOpacity: false,
    ringWidth: false,
  },
};
