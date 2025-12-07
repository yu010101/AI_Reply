import { motion } from 'framer-motion';
import { Card, CardProps } from '@mui/material';
import { cardVariants } from '@/utils/animations';

interface AnimatedCardProps extends CardProps {
  children: React.ReactNode;
  delay?: number;
  enableHover?: boolean;
}

/**
 * Animated Card Component
 * Card with fade-in and hover lift animations
 */
export default function AnimatedCard({
  children,
  delay = 0,
  enableHover = true,
  ...cardProps
}: AnimatedCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      whileHover={enableHover ? 'hover' : undefined}
      variants={cardVariants}
      transition={{ delay }}
    >
      <Card {...cardProps}>{children}</Card>
    </motion.div>
  );
}
