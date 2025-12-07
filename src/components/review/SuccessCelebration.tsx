import { useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import confetti from 'canvas-confetti';

interface SuccessCelebrationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export default function SuccessCelebration({
  show,
  message = '返信を投稿しました！',
  onComplete,
}: SuccessCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Trigger confetti animation
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          // Call onComplete after animation finishes
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Launch confetti from two points
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1999,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'background.paper',
                borderRadius: 3,
                minWidth: 300,
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 0.6,
                  times: [0, 0.3, 0.6, 1],
                }}
              >
                <CheckCircleIcon
                  sx={{
                    fontSize: 80,
                    color: 'success.main',
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Typography variant="h5" fontWeight="600" textAlign="center" color="success.main">
                  成功！
                </Typography>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Typography variant="body1" textAlign="center" color="text.secondary">
                  {message}
                </Typography>
              </motion.div>
            </Paper>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}
