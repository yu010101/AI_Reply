import { motion } from 'framer-motion';
import { Box } from '@mui/material';

interface TypingIndicatorProps {
  color?: string;
}

/**
 * Typing Indicator Animation
 * Shows animated dots for AI generation/loading states
 */
export default function TypingIndicator({ color = '#6366f1' }: TypingIndicatorProps) {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 },
  };

  const dotTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: 'reverse' as const,
    ease: 'easeInOut' as const,
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <motion.div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{ ...dotTransition, delay: 0 }}
      />
      <motion.div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{ ...dotTransition, delay: 0.2 }}
      />
      <motion.div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
        variants={dotVariants}
        initial="initial"
        animate="animate"
        transition={{ ...dotTransition, delay: 0.4 }}
      />
    </Box>
  );
}
