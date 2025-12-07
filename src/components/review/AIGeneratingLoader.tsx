import { Box, Typography, CircularProgress, Dialog } from '@mui/material';
import { motion } from 'framer-motion';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';

interface AIGeneratingLoaderProps {
  open?: boolean;
  message?: string;
}

const typingMessages = [
  'AIが返信を考えています',
  'レビュー内容を分析中',
  '最適な返信を生成中',
  'もう少しお待ちください',
];

export default function AIGeneratingLoader({ open = true, message }: AIGeneratingLoaderProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentMessage = message || typingMessages[currentMessageIndex];
    let currentIndex = 0;

    if (isTyping) {
      const typingInterval = setInterval(() => {
        if (currentIndex <= currentMessage.length) {
          setDisplayText(currentMessage.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);

          // Wait before moving to next message
          if (!message) {
            setTimeout(() => {
              setCurrentMessageIndex((prev) => (prev + 1) % typingMessages.length);
              setIsTyping(true);
            }, 1500);
          }
        }
      }, 80);

      return () => clearInterval(typingInterval);
    }
  }, [currentMessageIndex, isTyping, message]);

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={4}
        gap={3}
      >
        {/* Animated Icon */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              size={80}
              thickness={2}
              sx={{
                color: 'primary.main',
                opacity: 0.3,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon
                sx={{
                  fontSize: 40,
                  color: 'primary.main',
                }}
              />
            </Box>
          </Box>
        </motion.div>

        {/* Typing Text Animation */}
        <Box textAlign="center" minHeight={60}>
        <Typography
          variant="h6"
          color="primary"
          sx={{
            fontWeight: 500,
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {displayText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ marginLeft: '2px' }}
          >
            ...
          </motion.span>
        </Typography>

          {/* Progress dots */}
          <Box display="flex" gap={1} justifyContent="center" mt={2}>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                  }}
                />
              </motion.div>
            ))}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
