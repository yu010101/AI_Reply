/**
 * World-Class EmptyState Component
 *
 * Design Principles:
 * - Clear, helpful messaging
 * - Actionable call-to-action
 * - Accessible and semantic
 * - Consistent with design system
 */

import { Box, Typography, Button } from '@mui/material';
import { ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'compact' | 'card';
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  const isCard = variant === 'card';

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: isCompact ? 4 : 8,
        px: 3,
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      {/* Icon */}
      {icon && (
        <Box
          sx={{
            width: isCompact ? 48 : 64,
            height: isCompact ? 48 : 64,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
            mb: 3,
          }}
          aria-hidden="true"
        >
          {icon}
        </Box>
      )}

      {/* Title */}
      <Typography
        variant={isCompact ? 'body1' : 'h6'}
        sx={{
          fontWeight: 500,
          color: 'text.primary',
          mb: description ? 1 : actionLabel ? 3 : 0,
        }}
      >
        {title}
      </Typography>

      {/* Description */}
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: actionLabel ? 4 : 0,
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <Button
              variant="contained"
              onClick={onAction}
              startIcon={<AddIcon />}
              sx={{
                minHeight: 44,
                px: 3,
              }}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outlined"
              onClick={onSecondaryAction}
              sx={{
                minHeight: 44,
                px: 3,
              }}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  if (isCard) {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}

/**
 * Preset empty states for common use cases
 */
export const EmptyStatePresets = {
  NoLocations: (props: { onAction?: () => void }) => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      }
      title="店舗が登録されていません"
      description="最初の店舗を登録して、レビュー返信の自動化を始めましょう。"
      actionLabel="新規店舗を追加"
      onAction={props.onAction}
    />
  ),

  NoReviews: (props: { onAction?: () => void }) => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      }
      title="レビューがありません"
      description="Google Business Profileを連携して、レビューを取得しましょう。"
      actionLabel="レビューを同期"
      onAction={props.onAction}
    />
  ),

  NoTemplates: (props: { onAction?: () => void }) => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title="テンプレートがありません"
      description="返信テンプレートを作成して、効率的にレビューに対応しましょう。"
      actionLabel="テンプレートを作成"
      onAction={props.onAction}
    />
  ),

  NoData: () => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      }
      title="データがありません"
      description="この期間のデータはまだありません。"
      variant="compact"
    />
  ),

  SearchNoResults: (props: { query?: string; onClear?: () => void }) => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="検索結果がありません"
      description={props.query ? `「${props.query}」に一致する結果が見つかりませんでした。` : '検索条件に一致する結果が見つかりませんでした。'}
      actionLabel="検索をクリア"
      onAction={props.onClear}
      variant="compact"
    />
  ),

  Error: (props: { onRetry?: () => void; message?: string }) => (
    <EmptyState
      icon={
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title="エラーが発生しました"
      description={props.message || 'データの取得に失敗しました。再度お試しください。'}
      actionLabel="再試行"
      onAction={props.onRetry}
    />
  ),
};
