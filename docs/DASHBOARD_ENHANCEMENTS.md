# Dashboard Enhancements

## Overview

The dashboard has been enhanced to show **actionable insights** instead of just numbers. This includes trend indicators, progress bars, contextual metrics, actionable alerts, and visual polish with MUI components.

## New Features

### 1. Trend Indicators

Each stat card now shows trend information comparing current month vs. last month:

- **↑ Up arrow** with percentage for positive trends (green)
- **↓ Down arrow** with percentage for negative trends (red)
- Example: "総レビュー数: 45 (+15.5% from last month)"

### 2. Context to Metrics

#### Response Rate Card
- Shows current response rate as percentage
- Displays progress bar with target (80%)
- Color-coded based on performance:
  - Green: ≥80% (meeting target)
  - Orange: 50-79% (approaching target)
  - Red: <50% (below target)

#### Average Rating Card
- Shows average star rating (e.g., "4.2")
- Progress bar comparing to maximum (5 stars)
- Industry benchmark comparison in tooltip
- Color-coded performance indicator

### 3. Actionable Alerts

Smart alerts that appear at the top of the dashboard when action is needed:

#### Pending Reviews Alert
- **Trigger**: When there are unanswered reviews
- **Message**: "3件の未返信レビューがあります"
- **Action**: "未返信レビューを確認" button → navigates to pending reviews
- **Severity**: Warning (orange)

#### Low Rating Alert
- **Trigger**: When there are low-rated (1-2 star) reviews
- **Message**: "今週の1-2つ星レビュー: 2件 (先週比 +1)"
- **Action**: "低評価レビューを確認" button → navigates to low-rating reviews
- **Severity**: Error (red)

#### Response Rate Alert
- **Trigger**: When response rate < 50% and total reviews > 5
- **Message**: Shows current percentage and encourages improvement
- **Action**: Link to pending reviews
- **Severity**: Info (blue)

### 4. Improved Stat Cards

Each stat card includes:

#### Visual Enhancements
- **Gradient top border** matching the card's color theme
- **Subtle background tint** for better visual hierarchy
- **Gradient icon background** with shadow
- **Hover effects**: Lift animation and shadow on clickable cards
- **Click navigation**: Cards link to relevant pages

#### Data Visualizations
- **Mini Sparkline Charts**: 7-day trend shown as a small line chart (reviews and replies)
- **Progress Bars**: Show progress toward goals
- **Tooltips**: Hover for additional context and explanations

#### Color Coding
- **Primary** (Purple): Locations
- **Info** (Blue): Total Reviews
- **Warning** (Orange): Pending Reviews
- **Success** (Green): Replies, Good Performance
- **Error** (Red): Poor Performance

## Components

### `StatCard` Component

Location: `/src/components/dashboard/StatCard.tsx`

#### Props

```typescript
interface StatCardProps {
  title: string;              // Card title (e.g., "総レビュー数")
  value: string | number;     // Main value to display
  icon: ReactNode;            // MUI icon component
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: TrendData;          // Trend information
  progress?: ProgressData;    // Progress bar data
  sparkline?: SparklineData;  // 7-day trend data
  tooltip?: string;           // Hover tooltip
  onClick?: () => void;       // Click handler
}

type TrendData = {
  value: number;              // Absolute change
  percentage: number;         // Percentage change
  isPositive: boolean;        // Direction of trend
};

type ProgressData = {
  current: number;            // Current value
  target: number;             // Target value
  label?: string;             // Progress label
};

type SparklineData = number[];  // Array of daily values
```

#### Usage Example

```tsx
<StatCard
  title="返信率"
  value="75%"
  icon={<ReplyIcon />}
  color="warning"
  progress={{ current: 75, target: 80, label: '返信率目標' }}
  tooltip="全レビューに対する返信の割合（目標: 80%）"
/>
```

### `ActionableAlert` Component

Location: `/src/components/dashboard/ActionableAlert.tsx`

#### Props

```typescript
interface ActionableAlertProps {
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;              // Alert title
  message: string;            // Alert message
  icon?: ReactNode;           // Custom icon
  badge?: string | number;    // Badge showing count
  actions?: AlertAction[];    // Action buttons
  dismissible?: boolean;      // Can be dismissed
  defaultOpen?: boolean;      // Initial state
}

type AlertAction = {
  label: string;              // Button text
  onClick: () => void;        // Click handler
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
};
```

#### Usage Example

```tsx
<ActionableAlert
  severity="warning"
  title="未返信のレビューがあります"
  message="3件の未返信レビューがあります。早めの対応をお願いします。"
  badge={3}
  actions={[
    {
      label: '未返信レビューを確認',
      onClick: () => router.push('/reviews?filter=pending'),
      variant: 'contained',
      color: 'warning'
    }
  ]}
  icon={<NotificationsActiveIcon />}
/>
```

## Data Fetching

The dashboard now fetches:

1. **Current Statistics**: Total counts for locations, reviews, pending reviews, and replies
2. **Historical Data**: Last month's data for trend calculation
3. **Weekly Data**: This week vs. last week for low-rating alerts
4. **Derived Metrics**: Average rating, response rate
5. **Time-Series Data**: Daily data for sparklines (currently mocked, needs implementation)

### Database Queries

The dashboard makes the following Supabase queries:

- Current month counts (locations, reviews, pending reviews, replies)
- Last month counts (for trend calculation)
- Weekly low-rating review counts
- Average rating calculation from all reviews
- Response rate calculation (replies / total reviews)

### Future Enhancements

To get real sparkline data, implement daily aggregation:

```typescript
// Example: Fetch daily review counts for last 7 days
const dailyReviews = await Promise.all(
  Array.from({ length: 7 }, async (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    return count || 0;
  })
);
```

## Insights Section

The dashboard includes a basic insights section that provides:

- **Performance feedback** based on average rating
- **Actionable recommendations**
- **Encouragement** for maintaining good performance

This can be expanded to include:
- AI-powered insights from review sentiment
- Comparative analytics (vs. industry, vs. last period)
- Predictive trends
- Personalized recommendations

## Navigation

Clickable cards navigate to relevant pages:

- **登録店舗数** → `/locations`
- **総レビュー数** → `/reviews`
- **保留中のレビュー** → `/reviews?filter=pending`
- **総返信数** → `/reviews`

Alert action buttons also provide quick navigation to filtered views.

## Responsive Design

The dashboard is fully responsive:

- **Desktop (lg)**: 4 columns for main stats
- **Tablet (sm)**: 2 columns
- **Mobile (xs)**: 1 column (stacked)

Progress cards (response rate, average rating) take up 6 columns (half-width) on desktop.

## Color System

The color system provides visual hierarchy and instant performance feedback:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #6366f1 | General stats (locations) |
| Info | #3b82f6 | Information (total reviews) |
| Warning | #f59e0b | Attention needed (pending reviews) |
| Success | #10b981 | Good performance (high response rate) |
| Error | #ef4444 | Issues requiring action (low ratings) |

Each color includes:
- Main color
- Light variant
- Gradient
- Background tint (4% opacity)

## Accessibility

- **ARIA labels** on icon buttons
- **Tooltips** provide additional context
- **Color is not the only indicator** (icons and text accompany colors)
- **Keyboard navigation** supported on all interactive elements
- **Screen reader friendly** with semantic HTML and ARIA attributes

## Performance Considerations

1. **Efficient queries**: Uses Supabase's `count` with `head: true` for lightweight counting
2. **Parallel fetching**: Independent queries run in parallel
3. **Memoization**: Consider using `useMemo` for expensive calculations
4. **Lazy loading**: Sparkline data can be loaded separately if needed

## Testing

Key test scenarios:

1. **Empty state**: Dashboard with no data
2. **With data**: Various data scenarios
3. **Trend calculations**: Positive, negative, and zero trends
4. **Alert triggering**: Verify alerts appear based on conditions
5. **Navigation**: Click handlers work correctly
6. **Responsive**: Layout adapts to different screen sizes

## Migration from Old Dashboard

The old dashboard showed basic cards with simple counts. The new dashboard is a drop-in replacement with:

- ✅ Same data structure (extended with new fields)
- ✅ Backward compatible (all old fields still work)
- ✅ Enhanced UI with no breaking changes
- ✅ Progressive enhancement (graceful degradation if data unavailable)

## Screenshots

### Before
Simple stat cards with numbers only.

### After
- Rich stat cards with trends, sparklines, and progress bars
- Actionable alerts at the top
- Color-coded performance indicators
- Interactive hover effects
- Contextual insights

## Credits

Built with:
- **MUI (Material-UI)** v5.15.10
- **React** for component architecture
- **Supabase** for data fetching
- **Next.js** for routing

## Future Roadmap

- [ ] Real-time updates with Supabase subscriptions
- [ ] More detailed analytics page
- [ ] Customizable dashboard (drag-and-drop widgets)
- [ ] Export dashboard as PDF/image
- [ ] Advanced filtering and date range selection
- [ ] Comparative analytics (multiple locations)
- [ ] AI-powered insights and recommendations
- [ ] Mobile app with push notifications for alerts
