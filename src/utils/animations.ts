/**
 * Animation Utilities
 * Reusable animation configurations and helpers
 */

import { Variants } from 'framer-motion';

// Easing functions
export const easing = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  bounce: [0.68, -0.55, 0.265, 1.55],
  default: [0.4, 0, 0.2, 1],
} as const;

// Duration presets
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
} as const;

// Fade animations
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide animations
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
};

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.smooth,
    },
  },
};

// Card animations
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.smooth,
    },
  },
  hover: {
    y: -4,
    boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: duration.fast,
      ease: easing.smooth,
    },
  },
};

// Button animations
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      duration: duration.fast,
      ease: easing.smooth,
    },
  },
  tap: { scale: 0.98 },
};

// Modal/Dialog animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: duration.fast,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
    },
  },
};

// Toast notification animations
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 50,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: duration.normal,
      ease: easing.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.95,
    transition: {
      duration: duration.fast,
    },
  },
};

// Page transition animations
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.smooth,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
    },
  },
};

// List item animations
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: duration.normal,
      ease: easing.smooth,
    },
  }),
};

// Shake animation (for errors)
export const shakeVariants: Variants = {
  shake: {
    x: [0, -4, 4, -4, 4, 0],
    transition: {
      duration: 0.5,
      ease: easing.default,
    },
  },
};

// Pulse animation
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easing.smooth,
    },
  },
};

// Utility functions
export const getStaggerDelay = (index: number, baseDelay = 0.05): number => {
  return index * baseDelay;
};

export const getTransitionConfig = (
  type: 'fast' | 'normal' | 'slow' = 'normal',
  easingType: keyof typeof easing = 'smooth'
) => ({
  duration: duration[type],
  ease: easing[easingType],
});

// Milestone celebration config
export const celebrationConfig = {
  firstReply: {
    confettiCount: 50,
    duration: 2000,
  },
  milestone100: {
    confettiCount: 100,
    duration: 3000,
  },
  milestone500: {
    confettiCount: 150,
    duration: 4000,
  },
};
