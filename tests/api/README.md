# API Test Suite

This directory contains comprehensive unit tests for critical API endpoints in the AI_Reply application.

## Test Files

### 1. `auth.test.ts`
Comprehensive tests for authentication endpoints including:

#### Endpoints Covered:
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset

#### Test Coverage:
- ✅ Successful authentication flows
- ✅ Invalid credentials handling
- ✅ Missing required fields validation
- ✅ Session management
- ✅ Error responses (401, 400, 500)
- ✅ Method validation (405)
- ✅ AuthService unit tests (signUp, signIn, signOut, resetPassword, getCurrentUser)

#### Key Features:
- Mocks Supabase authentication
- Tests user profile creation on signup
- Validates last login timestamp updates
- Tests password reset email functionality
- Comprehensive error handling tests

### 2. `subscription.test.ts`
Comprehensive tests for subscription management endpoints including:

#### Endpoints Covered:
- `GET /api/subscriptions` - Get subscription details
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions` - Update subscription plan
- `DELETE /api/subscriptions` - Cancel subscription

#### Test Coverage:
- ✅ Subscription creation with Stripe checkout
- ✅ Plan upgrades and downgrades
- ✅ Subscription cancellation (immediate and at period end)
- ✅ Webhook event handling (created, updated, deleted)
- ✅ Stripe API error handling
- ✅ Database error handling
- ✅ Network timeout handling
- ✅ Authentication validation
- ✅ Invalid plan validation

#### Key Features:
- Mocks Stripe API calls
- Tests webhook events processing
- Validates subscription status transitions
- Tests customer creation flow
- Comprehensive error scenarios

### 3. `google-integration.test.ts`
Comprehensive tests for Google Business Profile integration including:

#### Endpoints Covered:
- `GET /api/auth/google-auth` - Initiate Google OAuth
- `GET /api/auth/google-callback` - Handle OAuth callback
- `POST /api/google-reviews/sync` - Sync reviews for a location
- `POST /api/google-reviews/sync-all` - Sync all locations
- `GET /api/google-business/accounts` - Fetch Google Business accounts

#### Test Coverage:
- ✅ OAuth flow initialization
- ✅ OAuth callback handling
- ✅ Token storage and management
- ✅ Review synchronization
- ✅ Multi-location sync
- ✅ Google API error handling
- ✅ Token expiration and refresh
- ✅ Rate limiting handling
- ✅ Permission errors
- ✅ Network errors

#### Key Features:
- Mocks Google OAuth2 client
- Tests token refresh mechanism
- Validates review data structure
- Tests error recovery flows
- Comprehensive API error scenarios

## Running Tests

### Run All API Tests
```bash
npm test tests/api/
```

### Run Specific Test File
```bash
npm test tests/api/auth.test.ts
npm test tests/api/subscription.test.ts
npm test tests/api/google-integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/api/
```

### Run in Watch Mode
```bash
npm test -- --watch tests/api/
```

## Test Results Summary

| Test Suite | Total Tests | Passing | Failing | Coverage |
|------------|-------------|---------|---------|----------|
| auth.test.ts | 17 | 17 | 0 | High |
| subscription.test.ts | 16 | 16 | 0 | High |
| google-integration.test.ts | 24 | 24 | 0 | High |
| **Total** | **57** | **57** | **0** | **High** |

## Mock Dependencies

The tests use the following mocked dependencies:

### Supabase
- `supabase.auth.*` - Authentication methods
- `supabase.from()` - Database queries

### Stripe
- `stripe.customers.*` - Customer management
- `stripe.subscriptions.*` - Subscription management
- `stripe.checkout.sessions.*` - Checkout sessions

### Google APIs
- `google.auth.OAuth2` - OAuth2 client
- `google.mybusinessaccountmanagement` - Account management
- `google.mybusinessbusinessinformation` - Business info

### Utilities
- `@/utils/security` - Security middleware
- `@/utils/monitoring` - Error monitoring
- `node-mocks-http` - HTTP request/response mocking

## Test Patterns

### 1. Request/Response Mocking
```typescript
const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
  method: 'POST',
  body: { email: 'test@example.com', password: 'password123' },
});
```

### 2. Supabase Mocking
```typescript
(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
  data: { user: mockUser, session: mockSession },
  error: null,
});
```

### 3. Error Testing
```typescript
mockStripe.subscriptions.create.mockRejectedValue(
  new Error('Stripe API error')
);
```

### 4. Assertion Patterns
```typescript
expect(res._getStatusCode()).toBe(200);
expect(JSON.parse(res._getData())).toEqual({
  success: true,
  data: expect.objectContaining({ id: expect.any(String) }),
});
```

## Configuration

Tests are configured in:
- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Global mocks and setup

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Cleanup**: `beforeEach()` clears all mocks to prevent test pollution
3. **Descriptive Names**: Test names clearly describe what is being tested
4. **Comprehensive Coverage**: Tests cover both success and error paths
5. **Realistic Mocks**: Mock data resembles actual API responses
6. **Error Scenarios**: Extensive testing of error conditions
7. **Type Safety**: Full TypeScript support with proper typing

## Adding New Tests

When adding new API tests:

1. Create a new test file in `/tests/api/`
2. Follow the existing naming convention: `*.test.ts`
3. Import required mocks from `jest.mock()` declarations
4. Organize tests by endpoint and HTTP method
5. Include both success and error cases
6. Update this README with coverage details

## Common Issues

### Mock Not Working
If mocks aren't working, ensure:
- Mock declarations are before the imports
- `jest.clearAllMocks()` is called in `beforeEach()`
- Mock paths match the actual import paths

### Type Errors
If you encounter TypeScript errors:
- Ensure types are imported from the correct locations
- Use `as jest.Mock` for mocked functions
- Check that `@types/*` packages are installed

### Test Timeouts
For tests that timeout:
- Check for unresolved promises
- Ensure all async operations are awaited
- Verify mock functions return resolved promises

## Contributing

When contributing tests:
1. Follow existing test structure and patterns
2. Ensure tests are deterministic and repeatable
3. Add comments for complex test scenarios
4. Update this README with new test coverage
5. Run all tests before committing: `npm test`

## Resources

- [Jest Documentation](https://jestjs.io/)
- [node-mocks-http](https://github.com/howardabrams/node-mocks-http)
- [Testing Next.js API Routes](https://nextjs.org/docs/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
