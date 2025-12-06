# Rate Limiting Configuration

## Overview

This application implements comprehensive rate limiting to protect against abuse and ensure fair resource usage. The rate limiting system supports both in-memory and Redis-based storage, with different limits for different endpoint types.

## Production Configuration

### Default Rate Limits

The following are the production-ready default rate limits configured in the system:

#### 1. Authentication Endpoints (`/api/auth/*`)
- **Window**: 5 minutes (300,000ms)
- **Max Requests**: 30
- **Purpose**: Prevent brute-force attacks on login/registration
- **Environment Variables**:
  - `RATE_LIMIT_AUTH_WINDOW_MS=300000`
  - `RATE_LIMIT_AUTH_MAX=30`

#### 2. API Endpoints - Authenticated Users
- **Window**: 1 minute (60,000ms)
- **Max Requests**: 200
- **Purpose**: Support normal application usage for authenticated users
- **Environment Variables**:
  - `RATE_LIMIT_API_AUTH_WINDOW_MS=60000`
  - `RATE_LIMIT_API_AUTH_MAX=200`

#### 3. API Endpoints - Public/Unauthenticated
- **Window**: 1 minute (60,000ms)
- **Max Requests**: 30
- **Purpose**: Limit unauthenticated access while allowing legitimate traffic
- **Environment Variables**:
  - `RATE_LIMIT_API_PUBLIC_WINDOW_MS=60000`
  - `RATE_LIMIT_API_PUBLIC_MAX=30`

#### 4. Write Endpoints (POST/PUT/DELETE/PATCH)
- **Window**: 1 minute (60,000ms)
- **Max Requests**: 50
- **Purpose**: Prevent spam and abuse of data modification operations
- **Environment Variables**:
  - `RATE_LIMIT_WRITE_WINDOW_MS=60000`
  - `RATE_LIMIT_WRITE_MAX=50`

#### 5. Webhook Endpoints (`/api/webhooks/*`)
- **Window**: 1 minute (60,000ms)
- **Max Requests**: 300
- **Purpose**: Handle burst traffic from external services (Stripe, Google, etc.)
- **Environment Variables**:
  - `RATE_LIMIT_WEBHOOK_WINDOW_MS=60000`
  - `RATE_LIMIT_WEBHOOK_MAX=300`

## Implementation Details

### Next.js Middleware (`/middleware.ts`)

The root middleware handles rate limiting for all API routes with the following features:

- **Automatic endpoint detection**: Different limits applied based on route and HTTP method
- **Redis support**: Automatically uses Redis if `REDIS_URL` is configured
- **Fallback to in-memory**: Uses Map-based storage if Redis is unavailable
- **Standard headers**: Returns `RateLimit-*` headers compliant with draft RFC

### Express Middleware (`/src/backend/middleware/rateLimit.ts`)

Provides three separate rate limiters for Express-based routes:

1. **`rateLimiter`**: General API rate limiter (differentiates auth vs public)
2. **`authRateLimiter`**: Strict limits for authentication endpoints
3. **`writeRateLimiter`**: Moderate limits for data modification operations

Usage example:
```typescript
import { rateLimiter, authRateLimiter, writeRateLimiter } from './middleware/rateLimit';

// General API endpoint
app.use('/api', rateLimiter);

// Authentication endpoint
app.use('/api/auth/login', authRateLimiter);

// Write endpoint
app.post('/api/data', writeRateLimiter);
```

## Redis Configuration

### Why Use Redis?

- **Distributed systems**: Shares rate limit state across multiple server instances
- **Persistence**: Maintains limits across server restarts
- **Performance**: Faster than database lookups
- **Scalability**: Handles high-traffic production environments

### Setup

1. Install Redis dependencies:
```bash
npm install redis rate-limit-redis
```

2. Configure Redis URL in your environment:
```bash
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud/Upstash:
REDIS_URL=redis://username:password@host:port
```

3. The application will automatically detect and use Redis when configured

### Redis Key Prefixes

The system uses the following key prefixes for different rate limit types:

- `rl:api:*` - General API endpoints
- `rl:auth:*` - Authentication endpoints
- `rl:write:*` - Write endpoints
- `rl:webhook:*` - Webhook endpoints

## Environment Variables Reference

Add these to your `.env.production` file:

```bash
# Redis (Optional but recommended for production)
REDIS_URL=redis://your-redis-url

# Authentication Endpoints
RATE_LIMIT_AUTH_WINDOW_MS=300000      # 5 minutes
RATE_LIMIT_AUTH_MAX=30                # 30 requests per window

# API Endpoints - Authenticated
RATE_LIMIT_API_AUTH_WINDOW_MS=60000   # 1 minute
RATE_LIMIT_API_AUTH_MAX=200           # 200 requests per minute

# API Endpoints - Public
RATE_LIMIT_API_PUBLIC_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_API_PUBLIC_MAX=30          # 30 requests per minute

# General API (fallback)
RATE_LIMIT_API_WINDOW_MS=60000        # 1 minute
RATE_LIMIT_API_MAX=200                # 200 requests per minute

# Write Endpoints
RATE_LIMIT_WRITE_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_WRITE_MAX=50               # 50 requests per minute

# Webhook Endpoints
RATE_LIMIT_WEBHOOK_WINDOW_MS=60000    # 1 minute
RATE_LIMIT_WEBHOOK_MAX=300            # 300 requests per minute
```

## Response Headers

When rate limiting is active, the following headers are returned:

- `RateLimit-Limit`: Maximum requests allowed in the window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Unix timestamp when the window resets
- `Retry-After`: Seconds to wait before retrying (only on 429 responses)

Example:
```
RateLimit-Limit: 200
RateLimit-Remaining: 150
RateLimit-Reset: 1638360000
```

## Error Response

When rate limit is exceeded (429 status):

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "レート制限を超えました。apiエンドポイントは60秒あたり200リクエストまでです。",
  "retryAfter": 45
}
```

## Monitoring and Tuning

### Monitoring

1. **Check rate limit headers** in API responses to track usage
2. **Monitor 429 responses** in your logging system
3. **Use Redis monitoring** tools if using Redis:
   ```bash
   redis-cli monitor | grep "rl:"
   ```

### Tuning Guidelines

Adjust limits based on your application's needs:

- **High traffic expected**: Increase limits or window size
- **API abuse detected**: Decrease limits for affected endpoints
- **Legitimate users affected**: Review and increase limits
- **Server load issues**: Decrease limits temporarily

### Testing Rate Limits

Test your rate limits in development:

```bash
# Test authentication endpoint (should limit after 30 requests in 5 minutes)
for i in {1..35}; do
  curl -X POST http://localhost:3000/api/auth/login
done

# Test API endpoint (should limit after 200 requests in 1 minute)
for i in {1..205}; do
  curl http://localhost:3000/api/some-endpoint
done
```

## Migration from Previous Configuration

### Changes from v1.0

- **Default window**: Changed from 15 minutes to 1 minute (more responsive)
- **Default limit**: Changed from 100 to endpoint-specific limits (200/30/50)
- **New features**:
  - Separate limits for auth, write, and webhook endpoints
  - Redis support for production scalability
  - Environment variable configuration for all limits
  - Standard RateLimit headers instead of X-RateLimit headers

### Backward Compatibility

The old environment variables are still supported but deprecated:
- `RATE_LIMIT_WINDOW_MS` → Use `RATE_LIMIT_API_WINDOW_MS`
- `RATE_LIMIT_MAX` → Use `RATE_LIMIT_API_MAX`

## Best Practices

1. **Use Redis in production**: Essential for multi-instance deployments
2. **Set appropriate limits**: Balance security with user experience
3. **Monitor regularly**: Track 429 responses and adjust as needed
4. **Document for users**: Include rate limits in API documentation
5. **Implement retry logic**: Client applications should respect Retry-After headers
6. **Whitelist if needed**: Consider IP whitelisting for trusted services
7. **Log limit hits**: Track which endpoints are hitting limits most often

## Troubleshooting

### Common Issues

**Issue**: Rate limits are not working
- **Solution**: Check that middleware is properly configured in your routes
- **Solution**: Verify environment variables are loaded

**Issue**: Limits reset unexpectedly
- **Solution**: Check server restart frequency (use Redis for persistence)
- **Solution**: Verify Redis connection if using Redis

**Issue**: All users share the same limit
- **Solution**: Ensure IP detection is working correctly
- **Solution**: Check proxy configuration for `x-forwarded-for` header

**Issue**: Redis connection errors
- **Solution**: Verify `REDIS_URL` is correct
- **Solution**: Check Redis server is running and accessible
- **Solution**: Review Redis authentication credentials

## Security Considerations

1. **DDoS Protection**: Rate limiting is one layer; also use CDN/WAF
2. **Credential Stuffing**: Auth endpoints have strictest limits
3. **API Abuse**: Write endpoints limited to prevent spam
4. **IP Spoofing**: Trust proxy headers only from known sources
5. **Redis Security**: Use TLS for Redis connections in production

## Support

For issues or questions about rate limiting configuration:
1. Check this documentation
2. Review logs for rate limit errors
3. Test with curl or Postman to verify behavior
4. Consult Redis logs if using Redis
