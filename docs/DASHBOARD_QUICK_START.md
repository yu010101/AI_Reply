# Dashboard Quick Start Guide

## What's New?

The dashboard now shows **actionable insights** instead of just numbers:

- ✅ **Trend indicators** (↑/↓ with percentages)
- ✅ **Progress bars** showing goals
- ✅ **Actionable alerts** with quick action buttons
- ✅ **Visual polish** with gradients and animations
- ✅ **Mini sparklines** showing 7-day trends
- ✅ **Clickable cards** for easy navigation

## Quick Look

### Before
```
┌──────────────┐
│ 総レビュー数  │
│     45       │
└──────────────┘
```

### After
```
┌──────────────────────────────┐
│ 総レビュー数 ⓘ         [📊]│
│                              │
│        45                    │
│                              │
│ ↑ +15.5% 先月比              │
│                              │
│ ╱╲╱╲╱╲╱  ← 7-day trend       │
└──────────────────────────────┘
```

## Key Features

### 1. Trend Indicators
Every stat shows comparison with last month:
- **Green ↑**: Positive trend (good!)
- **Red ↓**: Negative trend (needs attention)

### 2. Smart Alerts
Alerts appear only when action is needed:

**"未返信のレビューがあります"** (Warning)
- Shows when you have pending reviews
- Click button to view them

**"低評価レビューに注目"** (Error)
- Shows when you have 1-2 star reviews
- Compares this week vs last week

**"返信率が目標を下回っています"** (Info)
- Shows when response rate < 50%
- Encourages improvement

### 3. Progress Tracking

**Response Rate Card**
```
返信率: 75%
█████████████░░░  94% toward goal (80%)
```

**Average Rating Card**
```
平均評価: 4.2 ★
████████████░░  84% of max (5.0)
```

### 4. Click to Navigate
All cards are clickable:
- **登録店舗数** → Locations page
- **総レビュー数** → Reviews page
- **保留中のレビュー** → Pending reviews
- **総返信数** → Reviews page

## Using the Components

### Import
```tsx
import { StatCard, ActionableAlert } from '@/components/dashboard';
```

### StatCard Example
```tsx
<StatCard
  title="総レビュー数"
  value={45}
  icon={<RateReviewIcon />}
  color="info"
  trend={{ value: 7, percentage: 15.5, isPositive: true }}
  sparkline={[5, 7, 6, 8, 9, 7, 10]}
  tooltip="受け取った全レビューの数"
  onClick={() => router.push('/reviews')}
/>
```

### ActionableAlert Example
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

## Color Guide

| Color | When Used |
|-------|-----------|
| 🟣 Primary | General info (locations) |
| 🔵 Info | Metrics (total reviews) |
| 🟠 Warning | Needs attention (pending) |
| 🟢 Success | Good performance (high rate) |
| 🔴 Error | Issues (low ratings) |

## Customization

### Change Response Rate Target
Edit `/src/pages/dashboard.tsx`:
```tsx
const responseRateProgress: ProgressData = {
  current: Math.round(stats.responseRate),
  target: 90, // Change from 80 to 90
  label: '返信率目標',
};
```

### Add Custom Alert
```tsx
{yourCondition && (
  <ActionableAlert
    severity="info"
    title="Your Custom Alert"
    message="Your message here"
    actions={[{
      label: 'Action Label',
      onClick: yourHandler,
      variant: 'contained'
    }]}
  />
)}
```

## Files Created

1. **Components**
   - `/src/components/dashboard/StatCard.tsx`
   - `/src/components/dashboard/ActionableAlert.tsx`
   - `/src/components/dashboard/index.ts`

2. **Documentation**
   - `/docs/DASHBOARD_ENHANCEMENTS.md` - Full feature docs
   - `/docs/DASHBOARD_COMPONENT_EXAMPLES.md` - Visual examples
   - `/docs/DASHBOARD_QUICK_START.md` - This file
   - `/DASHBOARD_IMPLEMENTATION_SUMMARY.md` - Implementation summary

3. **Updated**
   - `/src/pages/dashboard.tsx` - Enhanced dashboard page

## Responsive Design

**Mobile** (xs): Cards stack vertically (1 column)
**Tablet** (sm): 2 columns
**Desktop** (lg): 4 columns for stats, 2 for progress cards

## Tips

1. **Hover over info icons (ⓘ)** for detailed explanations
2. **Click cards** to navigate to detailed views
3. **Use alert buttons** for quick access to filtered data
4. **Check trends** to see if metrics are improving
5. **Watch progress bars** to track goal achievement

## Need Help?

- **Full Documentation**: `/docs/DASHBOARD_ENHANCEMENTS.md`
- **Examples**: `/docs/DASHBOARD_COMPONENT_EXAMPLES.md`
- **Implementation Details**: `/DASHBOARD_IMPLEMENTATION_SUMMARY.md`

## Next Steps

1. Navigate to `/dashboard` to see the new design
2. Try clicking on different cards
3. Interact with alerts (if any appear)
4. Check tooltips for additional context
5. Customize as needed for your use case

Enjoy your enhanced dashboard! 🎉
