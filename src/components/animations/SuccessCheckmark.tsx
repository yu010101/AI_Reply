import { motion } from 'framer-motion';

interface SuccessCheckmarkProps {
  size?: number;
  color?: string;
}

/**
 * Success Checkmark Animation
 * Animated checkmark for success states
 */
export default function SuccessCheckmark({
  size = 64,
  color = '#10b981',
}: SuccessCheckmarkProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      <motion.circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
      <motion.path
        fill="none"
        stroke={color}
        strokeWidth="2"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}
