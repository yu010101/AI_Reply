/**
 * World-Class Loading Spinner
 *
 * Design Principles:
 * - Smooth, purposeful animation
 * - Accessibility: respects prefers-reduced-motion
 * - Semantic colors from design system
 * - Optional label for screen readers
 */

import { Box, CircularProgress, Typography } from '@mui/material';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  fullScreen?: boolean;
  color?: 'primary' | 'secondary';
};

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function LoadingSpinner({
  size = 'md',
  label,
  fullScreen = false,
  color = 'primary',
}: LoadingSpinnerProps) {
  const spinnerSize = sizeMap[size];

  const content = (
    <Box
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress
        size={spinnerSize}
        thickness={3}
        sx={{
          color: color === 'primary' ? 'ink' : 'secondary.main',
          // Respect reduced motion preference
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            '& .MuiCircularProgress-circle': {
              animation: 'none',
            },
          },
        }}
      />
      {label && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </Typography>
      )}
      {/* Screen reader only text when no label */}
      {!label && (
        <span
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          読み込み中
        </span>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLoader({
  lines = 3,
  showAvatar = false,
}: {
  lines?: number;
  showAvatar?: boolean;
}) {
  return (
    <Box
      role="status"
      aria-label="コンテンツを読み込み中"
      sx={{ width: '100%' }}
    >
      {showAvatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'border',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                height: 12,
                width: '40%',
                borderRadius: 1,
                bgcolor: 'border',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          </Box>
        </Box>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Box
          key={i}
          sx={{
            height: 12,
            width: i === lines - 1 ? '60%' : '100%',
            borderRadius: 1,
            bgcolor: 'border',
            mb: 1.5,
            animation: 'pulse 2s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
      ))}
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        読み込み中
      </span>
    </Box>
  );
}
