# Bulk AI Reply Feature - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              ReviewListBulk Component                          │ │
│  │  • Manages all state                                           │ │
│  │  • Handles selection logic                                     │ │
│  │  • Coordinates bulk operations                                 │ │
│  └──────────────┬──────────────┬──────────────┬───────────────────┘ │
│                 │              │              │                      │
│      ┌──────────▼────┐  ┌──────▼────┐  ┌─────▼─────┐               │
│      │ BulkActionBar │  │  Progress │  │  Review   │               │
│      │  Component    │  │  Dialog   │  │  Dialog   │               │
│      │               │  │           │  │           │               │
│      │ • Selection   │  │ • Real-   │  │ • Edit    │               │
│      │   counter     │  │   time    │  │ • Regen   │               │
│      │ • Action btns │  │   tracking│  │ • Post    │               │
│      └───────────────┘  └───────────┘  └───────────┘               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ API Calls
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         /api/ai-reply/bulk-generate                            │ │
│  │                                                                 │ │
│  │  1. Validate request                                           │ │
│  │  2. Check usage limits ──────┐                                 │ │
│  │  3. Fetch reviews/locations  │                                 │ │
│  │  4. Fetch template (optional)│                                 │ │
│  │  5. Generate replies (loop)  │                                 │ │
│  │     • Call OpenAI API        │                                 │ │
│  │     • 500ms delay            │                                 │ │
│  │     • Track success/failure  │                                 │ │
│  │  6. Return results           │                                 │ │
│  └──────────────────────────────┼─────────────────────────────────┘ │
│                                  │                                   │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
┌─────────────────────────────────┐  ┌──────────────────────────────┐
│      External Services           │  │     Database Layer           │
├─────────────────────────────────┤  ├──────────────────────────────┤
│                                  │  │                              │
│  ┌─────────────────────────┐    │  │  ┌────────────────────────┐ │
│  │   OpenAI API            │    │  │  │   Supabase             │ │
│  │   • gpt-4o model        │    │  │  │   • reviews table      │ │
│  │   • Chat completion     │    │  │  │   • locations table    │ │
│  │   • Rate limiting       │    │  │  │   • templates table    │ │
│  └─────────────────────────┘    │  │  │   • tenants table      │ │
│                                  │  │  │   • usage metrics      │ │
│                                  │  │  └────────────────────────┘ │
└─────────────────────────────────┘  └──────────────────────────────┘
```

## Data Flow Diagram

```
User Action: Select Reviews & Click "一括AI返信生成"
                    │
                    ▼
        ┌───────────────────────┐
        │  ReviewListBulk       │
        │  • Validate selection │
        │  • Show progress      │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  API: bulk-generate   │
        │  • Check auth         │
        │  • Check limits       │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  Fetch Data           │
        │  • Reviews            │
        │  • Locations          │
        │  • Templates          │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  For Each Review:     │
        │  1. Build prompt      │
        │  2. Call OpenAI       │
        │  3. Wait 500ms        │
        │  4. Store result      │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  Return Results       │
        │  • Success count      │
        │  • Failed count       │
        │  • Individual replies │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  BulkReplyReview      │
        │  • Display replies    │
        │  • Allow editing      │
        │  • Enable post        │
        └──────────┬────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │  Post All Replies     │
        │  • Update DB          │
        │  • Show success       │
        │  • Clear selection    │
        └───────────────────────┘
```

## Component Hierarchy

```
ReviewListBulk (Main Container)
│
├── Header Section
│   ├── Title
│   ├── Selection Mode Toggle Button
│   └── Sync Button
│
├── Location Selector (Chips)
│
├── Reviews Grid
│   └── Review Cards (Multiple)
│       ├── Checkbox (when in selection mode)
│       ├── Avatar
│       ├── Review Content
│       ├── Existing Reply (if any)
│       └── Action Buttons (when not in selection mode)
│           ├── AI Reply Generate
│           └── Manual Reply
│
├── BulkActionBar (Conditional - when reviews selected)
│   ├── Selection Count Display
│   ├── Cancel Button
│   └── Bulk Generate Button
│
├── BulkReplyProgress (Modal Dialog)
│   ├── Progress Bar
│   ├── Statistics (Success/Failed/Remaining)
│   └── Individual Review Status List
│       └── Review Items (Multiple)
│           ├── Status Icon
│           └── Reviewer Name
│
└── BulkReplyReview (Modal Dialog)
    ├── Header with Summary
    ├── Review List (Scrollable)
    │   └── Review Items (Multiple)
    │       ├── Original Review Display
    │       │   ├── Reviewer Info
    │       │   ├── Rating
    │       │   └── Comment
    │       └── Generated Reply Card
    │           ├── Reply Text (or TextField when editing)
    │           ├── Edit Button
    │           ├── Regenerate Button
    │           └── Status Chip
    └── Footer
        ├── Cancel Button
        └── Post All Button
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ReviewListBulk State                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Selection State:                                            │
│  • selectionMode: boolean                                    │
│  • selectedReviews: Set<string>                              │
│                                                               │
│  Bulk Generation State:                                      │
│  • bulkGenerating: boolean                                   │
│  • showBulkProgress: boolean                                 │
│  • bulkProgress: ReviewProgress[]                            │
│  • currentBulkIndex: number                                  │
│  • generatedBulkReplies: GeneratedReply[]                    │
│  • showBulkReview: boolean                                   │
│                                                               │
│  Review Data State:                                          │
│  • reviews: Review[]                                         │
│  • locations: Location[]                                     │
│  • selectedLocation: string | null                           │
│  • loading: boolean                                          │
│  • error: string | null                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

State Transitions:

1. Normal Mode → Selection Mode
   selectionMode: false → true
   (User clicks "一括選択モード")

2. Selection Mode → Bulk Generating
   selectedReviews.size > 0
   bulkGenerating: true
   showBulkProgress: true
   (User clicks "一括AI返信生成")

3. Bulk Generating → Review Generated
   bulkGenerating: false
   showBulkProgress: false → true (briefly)
   showBulkReview: true
   (API completes)

4. Review Generated → Posted
   showBulkReview: false
   selectionMode: false
   selectedReviews: clear
   (User clicks "すべて投稿")
```

## API Request/Response Schema

### Request to `/api/ai-reply/bulk-generate`

```typescript
POST /api/ai-reply/bulk-generate
Content-Type: application/json

{
  "reviewIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "tone": "friendly",        // optional
  "templateId": "uuid-tpl"   // optional
}
```

### Response from `/api/ai-reply/bulk-generate`

```typescript
200 OK
Content-Type: application/json

{
  "results": [
    {
      "reviewId": "uuid-1",
      "reply": "ご来店いただきありがとうございます...",
      "success": true
    },
    {
      "reviewId": "uuid-2",
      "reply": "",
      "success": false,
      "error": "API rate limit exceeded"
    }
  ],
  "summary": {
    "total": 3,
    "success": 2,
    "failed": 1
  }
}
```

### Error Responses

```typescript
// 401 Unauthorized
{
  "error": "認証されていません"
}

// 400 Bad Request
{
  "error": "レビューIDの配列が必要です"
}
{
  "error": "一度に処理できるのは50件までです"
}

// 403 Forbidden (Usage Limit)
{
  "error": "AI返信生成の上限に達しました",
  "limitExceeded": true,
  "currentUsage": 100,
  "limit": 100
}

// 500 Internal Server Error
{
  "error": "AI返信の生成に失敗しました"
}
```

## Database Schema (Relevant Tables)

```sql
-- reviews table (existing)
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  platform VARCHAR,
  platform_review_id VARCHAR,
  rating INTEGER,
  comment TEXT,
  reviewer_name VARCHAR,
  reviewer_avatar VARCHAR,
  review_date TIMESTAMP,
  response_text TEXT,           -- Generated reply stored here
  response_date TIMESTAMP,      -- Post date
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- locations table (existing)
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR,
  address TEXT,
  google_place_id VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- reply_templates table (existing)
CREATE TABLE reply_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR,
  content TEXT,
  tone VARCHAR,
  is_default BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- usage_metrics table (existing)
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  metric_type VARCHAR,          -- 'ai_reply'
  count INTEGER,
  date DATE,
  created_at TIMESTAMP
);
```

## Performance Characteristics

### Time Complexity

- **Selection Operations**: O(1) for add/remove, O(n) for select all
- **Bulk Generation**: O(n) where n = number of selected reviews
  - Sequential processing: ~2-3 seconds per review (API call + delay)
  - 10 reviews: ~20-30 seconds
  - 50 reviews: ~100-150 seconds (max allowed)

### Space Complexity

- **State Storage**: O(n) for selected reviews and generated replies
- **API Payload**: O(n) for review IDs and responses
- **Memory Usage**: Minimal - state cleared after posting

### Optimization Points

1. **Rate Limiting**: 500ms delay between API calls
2. **Batch Database Queries**: Fetch all reviews/locations in single queries
3. **Lazy Loading**: Progress updates only render visible items
4. **State Cleanup**: Clear generated replies after successful post

## Security Considerations

### Authentication & Authorization

```
User Request → Supabase Auth Check → User ID Extraction
                    ↓
            Verify User Owns Reviews
                    ↓
                Proceed or 401
```

### Input Validation

- Review IDs: UUID format validation
- Array length: Max 50 items
- Tone: Enum validation
- Template ID: Optional UUID validation

### Rate Limiting

- Usage metrics check before processing
- Per-tenant limits enforced
- Graceful degradation on limit exceeded

### Error Handling

- No sensitive data in error messages
- Proper HTTP status codes
- Detailed logging for debugging
- User-friendly error messages

## Monitoring & Observability

### Key Metrics to Track

1. **Performance Metrics**
   - Average generation time per review
   - Total bulk operation time
   - API response times

2. **Success Metrics**
   - Success rate per bulk operation
   - Individual review success rate
   - Post success rate

3. **Usage Metrics**
   - Number of bulk operations per day
   - Average reviews per bulk operation
   - Peak usage times

4. **Error Metrics**
   - API error rate
   - Rate limit hit frequency
   - Database error rate

### Logging Points

```typescript
// API Entry
logger.info('Bulk generation started', { reviewCount, userId });

// API Success
logger.info('Bulk generation completed', {
  successCount,
  failedCount,
  duration
});

// API Error
logger.error('Bulk generation failed', { error, userId, reviewIds });

// Individual Review Error
logger.warn('Review generation failed', {
  reviewId,
  error,
  attempt
});
```

## Scalability Considerations

### Current Limits

- Max 50 reviews per bulk operation
- Sequential processing (not parallel)
- 500ms delay between requests

### Future Scaling Options

1. **Horizontal Scaling**
   - Use queue system (Redis, RabbitMQ)
   - Process multiple bulk operations in parallel
   - Distribute load across multiple servers

2. **Vertical Scaling**
   - Increase API timeout limits
   - Reduce inter-request delay (if OpenAI allows)
   - Cache frequently used templates

3. **Database Optimization**
   - Add indexes on frequently queried fields
   - Use connection pooling
   - Implement read replicas for high traffic

---

**Last Updated**: 2025-12-07
**Version**: 1.0.0
