# Business Logic

## Authentication & Authorization

### Tenants
- The application is multi-tenant.
- Users belong to a **Tenant**.
- Data access is strictly scoped to the user's tenant.
- **RLS (Row Level Security)** in Supabase ensures data isolation.

### Roles
- **Admin**: Full access to tenant settings, users, and billing.
- **Member**: Access to reviews and replies, but restricted from billing and tenant settings.

## Review Management

### Ingestion
- Reviews are ingested from external platforms (Google Maps, etc.).
- Ingestion happens via:
    1.  **Periodic Batch Jobs**: AWS Lambda functions running on a schedule.
    2.  **Manual Trigger**: User initiates sync from the dashboard.

### Reply Generation
- **AI Engine**: OpenAI API (GPT-4/3.5).
- **Process**:
    1.  User selects a review.
    2.  User chooses a **Tone** (Polite, Casual, Professional, etc.).
    3.  Backend sends review content + tone to OpenAI.
    4.  Generated reply is returned to the frontend for editing/approval.
- **Templates**: Users can save and use reply templates for common scenarios.

## Subscription & Billing

- **Provider**: Stripe.
- **Plans**:
    - **Free**: Limited number of replies/month.
    - **Pro**: Higher limits, advanced analytics.
    - **Enterprise**: Custom limits, priority support.
- **Enforcement**:
    - API endpoints check usage limits before generating replies.
    - Frontend disables actions when limits are reached.

## Analytics

- **Metrics**:
    - Average Rating
    - Review Volume over time
    - Sentiment Analysis (Positive/Negative/Neutral)
- **Data Source**: Aggregated from stored reviews in Supabase.
