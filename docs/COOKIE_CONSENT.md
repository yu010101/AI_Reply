# Cookie Consent Banner - GDPR Compliant

## Overview

This application includes a fully GDPR-compliant Cookie Consent Banner that allows users to control their cookie preferences. The implementation follows EU regulations and best practices for user privacy.

## Features

### Core Features
- ✅ Fixed bottom banner with smooth slide-in animation
- ✅ Clear explanation of cookie usage in Japanese
- ✅ Three consent options: "すべて許可", "必要なCookieのみ", "設定"
- ✅ Granular cookie settings dialog
- ✅ Persistent storage in localStorage with timestamp
- ✅ Auto-hide banner after consent is given
- ✅ Responsive design (mobile-friendly)
- ✅ Links to Privacy Policy and Cookie Policy

### Cookie Categories

1. **必須Cookie (Necessary Cookies)** - Always enabled
   - Required for basic site functionality
   - Cannot be disabled
   - Examples: Authentication, security, session management

2. **分析Cookie (Analytics Cookies)** - Optional
   - Used for understanding site usage
   - Helps improve the service
   - Examples: Google Analytics, usage statistics

3. **マーケティングCookie (Marketing Cookies)** - Optional
   - Used for targeted advertising
   - May share data with third parties
   - Examples: Facebook Pixel, LinkedIn Insight Tag

## File Structure

```
src/
├── components/
│   └── legal/
│       └── CookieConsent.tsx         # Main banner component
├── hooks/
│   └── useCookieConsent.ts           # Hook for managing consent state
└── utils/
    └── cookieConsent.ts              # Utility functions for consent checks

pages/
└── _app.tsx                          # Updated to include CookieConsent
```

## Usage

### Basic Integration

The Cookie Consent Banner is automatically displayed to all users when they first visit the site. It's integrated in `_app.tsx`:

```tsx
import { CookieConsent } from '@/components/legal/CookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
```

### Using the Hook

You can access consent state and functions in any component:

```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

function MyComponent() {
  const {
    consent,
    showBanner,
    acceptAll,
    acceptNecessaryOnly,
    updatePreferences,
    revokeConsent,
    hasConsent,
  } = useCookieConsent();

  // Check if user has consented to analytics
  if (consent?.preferences.analytics) {
    // Load analytics scripts
  }

  // Programmatically accept all cookies
  const handleAcceptAll = () => {
    acceptAll();
  };

  return (
    <div>
      {hasConsent ? 'User has consented' : 'No consent yet'}
    </div>
  );
}
```

### Utility Functions

Use the utility functions to check consent status:

```tsx
import {
  hasAnalyticsConsent,
  hasMarketingConsent,
  trackEvent,
  trackPageView,
} from '@/utils/cookieConsent';

// Check consent before loading analytics
if (hasAnalyticsConsent()) {
  loadGoogleAnalytics('G-XXXXXXXXXX');
}

// Track events (automatically checks consent)
trackEvent('button_click', { button_id: 'signup' });

// Track page views
trackPageView('/dashboard', 'Dashboard');
```

### Google Analytics Integration

To integrate with Google Analytics 4:

1. **Initialize consent mode** (in `_app.tsx` or `_document.tsx`):

```tsx
import { useEffect } from 'react';
import { initializeGoogleAnalyticsConsent } from '@/utils/cookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize consent mode before GA loads
    initializeGoogleAnalyticsConsent();
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
```

2. **Load GA script after consent**:

```tsx
import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { loadGoogleAnalytics } from '@/utils/cookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent?.preferences.analytics) {
      loadGoogleAnalytics('G-XXXXXXXXXX');
    }
  }, [consent]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
```

## GDPR Compliance

This implementation follows GDPR requirements:

### ✅ Explicit Consent
- Users must explicitly choose to accept cookies
- No pre-checked boxes or assumed consent
- Clear "Accept" actions required

### ✅ Granular Control
- Users can choose specific cookie categories
- Necessary cookies are always clearly marked
- Optional cookies can be individually enabled/disabled

### ✅ Easy Withdrawal
- Users can change preferences at any time
- `revokeConsent()` function clears all consent data
- Settings dialog allows updating preferences

### ✅ Information Transparency
- Clear explanation of what each cookie category does
- Links to detailed Privacy Policy and Cookie Policy
- Japanese language for target audience

### ✅ Data Storage
- Consent stored locally (not sent to server without user action)
- Timestamp recorded for audit purposes
- Version tracking for policy updates

## Consent Data Structure

Consent is stored in localStorage as JSON:

```typescript
{
  preferences: {
    necessary: true,      // Always true
    analytics: boolean,   // User choice
    marketing: boolean    // User choice
  },
  timestamp: 1234567890,  // When consent was given
  version: "1.0"          // Policy version
}
```

## Customization

### Styling

The component uses MUI theme. Customize by modifying the `sx` props:

```tsx
<Button
  variant="contained"
  onClick={acceptAll}
  sx={{
    borderRadius: 2,
    // Add your custom styles here
    backgroundColor: 'custom.primary',
  }}
>
  すべて許可
</Button>
```

### Animation

Animations use framer-motion. Customize the motion parameters:

```tsx
<motion.div
  initial={{ y: 100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: 100, opacity: 0 }}
  transition={{
    type: 'spring',
    stiffness: 300,  // Adjust for different animation feel
    damping: 30,
  }}
>
```

### Cookie Policy Links

Update the links in `CookieConsent.tsx`:

```tsx
<Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">
  プライバシーポリシー
</Link>
<Link href="/cookie-policy" target="_blank" rel="noopener noreferrer">
  Cookie ポリシー
</Link>
```

## Testing

### Manual Testing

1. **First Visit**
   - Clear localStorage
   - Reload page
   - Banner should appear with smooth animation

2. **Accept All**
   - Click "すべて許可"
   - Banner should disappear
   - localStorage should have all preferences set to true

3. **Necessary Only**
   - Click "必要なCookieのみ"
   - Banner should disappear
   - Only necessary cookies should be enabled

4. **Custom Settings**
   - Click "設定"
   - Dialog should open
   - Toggle analytics/marketing switches
   - Click "設定を保存"
   - Preferences should be saved

5. **Persistence**
   - Reload page
   - Banner should not appear (consent already given)

6. **Responsive Design**
   - Test on mobile viewport
   - Banner should be full-width
   - Buttons should stack vertically

### Programmatic Testing

```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

// In your test component
function TestComponent() {
  const { revokeConsent, acceptAll, consent } = useCookieConsent();

  return (
    <div>
      <button onClick={revokeConsent}>Reset Consent</button>
      <button onClick={acceptAll}>Accept All</button>
      <pre>{JSON.stringify(consent, null, 2)}</pre>
    </div>
  );
}
```

## Troubleshooting

### Banner Not Showing
- Check if consent already exists in localStorage
- Clear localStorage and reload
- Ensure `<CookieConsent />` is included in `_app.tsx`

### Preferences Not Saving
- Check browser console for errors
- Verify localStorage is not disabled
- Check if localStorage quota is exceeded

### Analytics Not Working
- Ensure user has consented to analytics cookies
- Check `hasAnalyticsConsent()` returns true
- Verify GA script is loaded after consent

## Future Enhancements

Potential improvements:

1. **Server-side consent tracking** - Store consent in database for logged-in users
2. **A/B testing integration** - Test different banner designs
3. **Multi-language support** - Support English, Chinese, etc.
4. **Cookie scanner** - Automatically detect cookies on the site
5. **Consent management API** - Integrate with IAB TCF or similar frameworks

## Resources

- [GDPR Official Website](https://gdpr.eu/)
- [Google Analytics Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [MUI Documentation](https://mui.com/)
- [Framer Motion Documentation](https://www.framer.com/motion/)

## Support

For questions or issues:
1. Check this documentation
2. Review the code comments in `CookieConsent.tsx` and `useCookieConsent.ts`
3. Test with browser DevTools console open
4. Contact the development team

---

**Last Updated:** 2025-12-07
**Version:** 1.0
**Compliance:** GDPR, ePrivacy Directive
