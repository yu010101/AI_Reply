import { Box, Card, CardContent, Skeleton } from '@mui/material';

interface SkeletonCardProps {
  variant?: 'review' | 'dashboard' | 'location';
}

/**
 * Skeleton Card Component
 * Shows loading skeleton instead of spinner
 */
export default function SkeletonCard({ variant = 'review' }: SkeletonCardProps) {
  if (variant === 'dashboard') {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box ml={2} flex={1}>
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={60} />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'location') {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={30} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
          <Box mt={2} display="flex" gap={1}>
            <Skeleton variant="rounded" width={80} height={32} />
            <Skeleton variant="rounded" width={80} height={32} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Default: review card
  return (
    <Card>
      <CardContent>
        <Box display="flex" mb={2}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box ml={2} flex={1}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="30%" />
          </Box>
        </Box>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
        </Box>
      </CardContent>
    </Card>
  );
}
