import { Box, Card, CardContent, Typography, LinearProgress, Tooltip, IconButton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
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
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: TrendData;
  progress?: ProgressData;
  sparkline?: SparklineData;
  tooltip?: string;
  onClick?: () => void;
}

const colorMap = {
  primary: {
    main: '#6366f1',
    light: '#818cf8',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bg: 'rgba(99, 102, 241, 0.04)',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bg: 'rgba(16, 185, 129, 0.04)',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bg: 'rgba(245, 158, 11, 0.04)',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    bg: 'rgba(239, 68, 68, 0.04)',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    bg: 'rgba(59, 130, 246, 0.04)',
  },
};

export default function StatCard({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  progress,
  sparkline,
  tooltip,
  onClick,
}: StatCardProps) {
  const colors = colorMap[color];
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
      <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: '50%', height: 40, opacity: 0.3 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={colors.main}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Box>
    );
  };

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        background: colors.bg,
        border: '1px solid',
        borderColor: 'transparent',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
              borderColor: colors.light,
            }
          : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: colors.gradient,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            {tooltip && (
              <Tooltip title={tooltip} arrow>
                <IconButton size="small" sx={{ p: 0.5 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.gradient,
              color: 'white',
              boxShadow: `0 4px 12px ${colors.main}40`,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, color: 'text.primary' }}>
          {value}
        </Typography>

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            {trend.isPositive ? (
              <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 18, color: 'error.main' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: trend.isPositive ? 'success.main' : 'error.main',
                fontWeight: 600,
              }}
            >
              {trend.percentage > 0 ? '+' : ''}
              {trend.percentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              先月比
            </Typography>
          </Box>
        )}

        {progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {progress.label || '目標達成率'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {progress.current} / {progress.target}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progressPercentage, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.05)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: colors.gradient,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progressPercentage.toFixed(0)}% 達成
            </Typography>
          </Box>
        )}

        {renderSparkline()}
      </CardContent>
    </Card>
  );
}
