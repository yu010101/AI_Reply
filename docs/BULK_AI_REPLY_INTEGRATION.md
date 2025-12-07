# Bulk AI Reply Integration Guide

## Quick Start

To enable the bulk AI reply functionality in your reviews page, follow these steps:

## Step 1: Update Reviews Page

Replace the existing `ReviewList` component with `ReviewListBulk` in your reviews page:

```tsx
// pages/reviews.tsx
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import ReviewListBulk from '@/components/review/ReviewListBulk'; // Changed from ReviewList

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReviewListBulk />
      </Layout>
    </AuthGuard>
  );
}
```

## Step 2: Verify Dependencies

Ensure these components exist in your project:

### Required Components
- ✓ `/src/components/review/ReviewListBulk.tsx` - Main review list with bulk functionality
- ✓ `/src/components/review/BulkActionBar.tsx` - Bottom action bar
- ✓ `/src/components/review/BulkReplyProgress.tsx` - Progress dialog
- ✓ `/src/components/review/BulkReplyReview.tsx` - Review interface
- ✓ `/src/components/ai-reply/ToneSelector.tsx` - Tone selection (should already exist)
- ✓ `/src/components/review/AIReplyPreviewDialog.tsx` - Preview dialog (should already exist)
- ✓ `/src/components/review/AIGeneratingLoader.tsx` - Loading animation (should already exist)
- ✓ `/src/components/review/SuccessCelebration.tsx` - Success animation (should already exist)

### Required API Endpoints
- ✓ `/pages/api/ai-reply/bulk-generate.ts` - Bulk generation endpoint
- ✓ `/pages/api/ai-reply/generate.ts` - Single generation endpoint (should already exist)

## Step 3: Test the Feature

### Manual Testing Steps

1. **Navigate to Reviews Page**
   - Go to `/reviews`
   - Ensure reviews are loaded

2. **Enter Selection Mode**
   - Click "一括選択モード" button
   - Verify checkboxes appear on all review cards

3. **Select Reviews**
   - Click individual checkboxes
   - Try "すべて選択" button
   - Try "未返信のみ選択" button
   - Verify selection count updates in bottom bar

4. **Generate Bulk Replies**
   - Click "一括AI返信生成" button
   - Verify progress dialog appears
   - Watch progress indicators update
   - Wait for completion message

5. **Review Generated Replies**
   - Verify review dialog appears after generation
   - Try editing a reply
   - Try regenerating a reply
   - Verify changes are reflected

6. **Post Replies**
   - Click "すべて投稿" button
   - Verify success message appears
   - Check that replies are saved in database

### Automated Testing

Run E2E tests:
```bash
npm run test:e2e -- bulk-ai-reply.spec.ts
```

## Step 4: Configure (Optional)

### Adjust Bulk Limits

In `/pages/api/ai-reply/bulk-generate.ts`, you can adjust:

```typescript
// Maximum reviews per bulk request (default: 50)
if (reviewIds.length > 50) {
  return res.status(400).json({ error: '一度に処理できるのは50件までです' });
}

// Delay between requests to respect rate limits (default: 500ms)
await new Promise(resolve => setTimeout(resolve, 500));
```

### Customize Tones

Default tone is set in the bulk generation. To change:

```typescript
// In ReviewListBulk.tsx, handleBulkGenerate function
const tone = DEFAULT_TONE; // Change this to 'formal', 'friendly', 'apologetic', etc.
```

Or add UI to let users select tone before bulk generation.

## Rollback Instructions

If you need to revert to the original functionality:

1. Change back to original `ReviewList` component:
```tsx
import ReviewList from '@/components/review/ReviewList';

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <Layout>
        <ReviewList />
      </Layout>
    </AuthGuard>
  );
}
```

2. The original `ReviewList.tsx` is backed up at:
   `/src/components/review/ReviewList.tsx.backup`

## Troubleshooting

### Issue: "一括選択モード" button not appearing

**Solution**: Ensure you're using `ReviewListBulk` component, not the original `ReviewList`.

### Issue: Bulk generation API returns 404

**Solution**: Verify `/pages/api/ai-reply/bulk-generate.ts` exists and is correctly placed.

### Issue: Progress dialog doesn't show

**Solution**: Check that `BulkReplyProgress` component is properly imported and the `showBulkProgress` state is being set.

### Issue: Generated replies not displaying

**Solution**: Verify API response format matches the expected structure in `BulkReplyReview` component.

### Issue: Rate limit errors

**Solution**: Increase the delay between requests in `bulk-generate.ts` API endpoint:
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // Increase to 1 second
```

## Performance Tips

### For Large Review Counts

If you have locations with hundreds of reviews:

1. **Add Pagination**: Modify `ReviewListBulk` to load reviews in pages
2. **Limit Selection**: Add a max selection count (e.g., 20-30 at a time)
3. **Increase Delays**: Adjust rate limit delays to avoid API errors

### For Slow Network

1. **Add Timeout Handling**: Implement retry logic for failed requests
2. **Show Loading States**: Add more granular loading indicators
3. **Optimize Queries**: Use database indexes on frequently queried fields

## Feature Flags (Optional)

To enable/disable the feature dynamically:

```typescript
// In ReviewsPage.tsx
const ENABLE_BULK_REPLIES = process.env.NEXT_PUBLIC_ENABLE_BULK_REPLIES === 'true';

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <Layout>
        {ENABLE_BULK_REPLIES ? <ReviewListBulk /> : <ReviewList />}
      </Layout>
    </AuthGuard>
  );
}
```

Add to `.env.local`:
```
NEXT_PUBLIC_ENABLE_BULK_REPLIES=true
```

## Monitoring

Track these events in your analytics:

```typescript
// Example using Google Analytics
gtag('event', 'bulk_reply_generate', {
  review_count: selectedReviews.size,
  success_count: successCount,
  failed_count: failedCount,
});

gtag('event', 'bulk_reply_post', {
  review_count: replies.length,
});
```

## Migration Checklist

- [ ] Backup existing `ReviewList.tsx` component
- [ ] Install new components (already done)
- [ ] Update reviews page to use `ReviewListBulk`
- [ ] Test selection mode
- [ ] Test bulk generation with 2-3 reviews
- [ ] Test with maximum allowed reviews
- [ ] Test error scenarios (no API key, rate limits)
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Run E2E test suite
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for errors in first 24 hours

## Support

For issues or questions:
1. Check the main documentation: `/docs/BULK_AI_REPLY_FEATURE.md`
2. Review E2E tests for usage examples: `/e2e/bulk-ai-reply.spec.ts`
3. Check component source code for implementation details

## Next Steps

After successful integration, consider:

1. **User Training**: Create tutorial/guide for users
2. **Analytics Setup**: Track feature usage and success rates
3. **Feedback Collection**: Gather user feedback for improvements
4. **Performance Monitoring**: Track API response times and error rates
5. **Feature Enhancement**: Implement suggested future improvements

---

**Integration Date**: ___________
**Integrated By**: ___________
**Status**: [ ] In Progress [ ] Testing [ ] Production
