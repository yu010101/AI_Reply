import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { pageVariants } from '@/utils/animations';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Page Transition Component
 * Wraps page content with fade transition animations
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={router.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
