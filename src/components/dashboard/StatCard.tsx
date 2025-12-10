/**
 * World-Class StatCard Component
 *
 * Design Principles:
 * - Monochromatic elegance (no colorful gradients)
 * - Clear visual hierarchy
 * - Subtle micro-interactions
 * - Accessible focus states
 * - Consistent with "Clarity Through Simplicity" design system
 */

import { Box, Card, CardContent, Typography, LinearProgress, Tooltip, IconButton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ReactNode } from 'react';

export type TrendData = {
  value: number;
  percentage: number;
  isPositive: boolean;
};

export type ProgressData = {
  current: number;
  target: number;
  label?: string;
};

export type SparklineData = number[];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  trend?: TrendData;
  progress?: ProgressData;
  sparkline?: SparklineData;
  tooltip?: string;
  onClick?: () => void;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  variant = 'default',
  trend,
  progress,
  sparkline,
  tooltip,
  onClick,
  loading = false,
}: StatCardProps) {
  const progressPercentage = progress ? (progress.current / progress.target) * 100 : 0;

  const renderSparkline = () => {
    if (!sparkline || sparkline.length === 0) return null;

    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;

    const points = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '40%',
          height: 32,
          opacity: 0.2,
        }}
        aria-hidden="true"
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Box>
    );
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.percentage === 0) {
      return <TrendingFlatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
    return trend.isPositive ? (
      <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
    ) : (
      <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
    );
  };

  const cardStyles = {
    default: {
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
    },
    outlined: {
      bgcolor: 'transparent',
      border: '1px solid',
      borderColor: 'divider',
    },
    elevated: {
      bgcolor: 'background.paper',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
  };

  return (
    <Card
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
      aria-label={`${title}: ${value}${trend ? `, ${trend.isPositive ? '上昇' : '下降'} ${Math.abs(trend.percentage).toFixed(1)}%` : ''}`}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 2,
        textAlign: 'left',
        width: '100%',
        ...cardStyles[variant],
        '&:hover': onClick
          ? {
              borderColor: 'text.secondary',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            }
          : {},
        '&:focus-visible': {
          outline: 'none',
          boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
        },
        '&:active': onClick
          ? {
              transform: 'translateY(0)',
            }
          : {},
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, letterSpacing: '0.01em' }}
            >
              {title}
            </Typography>
            {tooltip && (
              <Tooltip title={tooltip} arrow placement="top">
                <IconButton
                  size="small"
                  sx={{
                    p: 0.5,
                    '&:focus-visible': {
                      boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #0F172A',
                    },
                  }}
                  aria-label={`${title}の詳細情報`}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              color: 'text.primary',
            }}
            aria-hidden="true"
          >
            {icon}
          </Box>
        </Box>

        {/* Value */}
        {loading ? (
          <Box
            sx={{
              height: 36,
              width: '60%',
              borderRadius: 1,
              bgcolor: 'action.hover',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
        ) : (
          <Typography
            variant="h4"
            sx={{
              fontWeight: 500,
              mb: 1,
              color: 'text.primary',
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </Typography>
        )}

        {/* Trend */}
        {trend && !loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: progress ? 2 : 0 }}>
            {getTrendIcon()}
            <Typography
              variant="body2"
              sx={{
                color: trend.percentage === 0
                  ? 'text.secondary'
                  : trend.isPositive
                    ? 'success.main'
                    : 'error.main',
                fontWeight: 500,
              }}
            >
              {trend.percentage > 0 ? '+' : ''}
              {trend.percentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ ml: 0.5 }}>
              先月比
            </Typography>
          </Box>
        )}

        {/* Progress */}
        {progress && !loading && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {progress.label || '達成率'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {progress.current.toLocaleString()} / {progress.target.toLocaleString()}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progressPercentage, 100)}
              aria-label={`${progress.label || '達成率'}: ${progressPercentage.toFixed(0)}%`}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  backgroundColor: 'text.primary',
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 0.5, display: 'block' }}
            >
              {progressPercentage.toFixed(0)}% 達成
            </Typography>
          </Box>
        )}

        {renderSparkline()}
      </CardContent>
    </Card>
  );
}
