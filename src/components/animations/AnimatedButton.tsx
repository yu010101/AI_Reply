import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@mui/material';
import { buttonVariants } from '@/utils/animations';

interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode;
}

/**
 * Animated Button Component
 * Button with hover scale and tap animations
 */
export default function AnimatedButton({
  children,
  ...buttonProps
}: AnimatedButtonProps) {
  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{ display: 'inline-block' }}
    >
      <Button {...buttonProps}>{children}</Button>
    </motion.div>
  );
}
