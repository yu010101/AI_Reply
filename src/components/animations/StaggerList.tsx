import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/utils/animations';

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Stagger List Component
 * Animates children with staggered fade-in effect
 */
export default function StaggerList({ children, className }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerListItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
