# Cookie Consent - Quick Reference

## 📦 Installation

Already integrated! No installation needed. The component is automatically shown on first visit.

## 🚀 Quick Start

### Check if user has consented

```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

function MyComponent() {
  const { consent, hasConsent } = useCookieConsent();

  if (hasConsent) {
    // User has consented
  }
}
```

### Check specific consent

```tsx
import { hasAnalyticsConsent, hasMarketingConsent } from '@/utils/cookieConsent';

// Check analytics
if (hasAnalyticsConsent()) {
  // Load Google Analytics
}

// Check marketing
if (hasMarketingConsent()) {
  // Load Facebook Pixel
}
```

### Track events

```tsx
import { trackEvent } from '@/utils/cookieConsent';

// Automatically checks consent before tracking
trackEvent('button_click', {
  button_id: 'signup',
  page: '/home'
});
```

### Add to settings page

```tsx
import { CookieSettingsPanel } from '@/components/legal/CookieSettingsPanel';

export default function SettingsPage() {
  return <CookieSettingsPanel />;
}
```

### Show banner again

```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

function CookieButton() {
  const { revokeConsent } = useCookieConsent();

  return (
    <Button onClick={revokeConsent}>
      Cookie設定を変更
    </Button>
  );
}
```

## 📋 Hook API

### useCookieConsent()

```tsx
const {
  consent,              // CookieConsent | null
  showBanner,          // boolean
  isLoading,           // boolean
  acceptAll,           // () => void
  acceptNecessaryOnly, // () => void
  updatePreferences,   // (prefs: CookiePreferences) => void
  revokeConsent,       // () => void
  hasConsent,          // boolean
} = useCookieConsent();
```

## 🔧 Utility Functions

### cookieConsent.ts

```tsx
import {
  getCookieConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  hasAnyConsent,
  initializeGoogleAnalyticsConsent,
  loadGoogleAnalytics,
  trackEvent,
  trackPageView,
} from '@/utils/cookieConsent';

// Get consent
const consent = getCookieConsent();

// Check consent
const analytics = hasAnalyticsConsent();
const marketing = hasMarketingConsent();
const any = hasAnyConsent();

// Initialize GA consent mode
initializeGoogleAnalyticsConsent();

// Load GA4
loadGoogleAnalytics('G-XXXXXXXXXX');

// Track
trackEvent('event_name', { param: 'value' });
trackPageView('/page', 'Page Title');
```

## 📊 Data Structure

### CookieConsent

```typescript
{
  preferences: {
    necessary: true,    // Always true
    analytics: boolean, // User choice
    marketing: boolean  // User choice
  },
  timestamp: number,    // Unix timestamp
  version: string       // "1.0"
}
```

### CookiePreferences

```typescript
{
  necessary: boolean,   // Always true
  analytics: boolean,   // Google Analytics
  marketing: boolean    // Ads, Facebook Pixel
}
```

## 🎨 Components

### CookieConsent (Banner)

```tsx
import { CookieConsent } from '@/components/legal/CookieConsent';

// Auto-imported in _app.tsx
<CookieConsent />
```

### CookieSettingsPanel (Settings Page)

```tsx
import { CookieSettingsPanel } from '@/components/legal/CookieSettingsPanel';

// Use in settings page
<CookieSettingsPanel />
```

## 🧪 Testing Commands

```bash
# Clear consent (show banner again)
localStorage.clear()

# Check current consent
localStorage.getItem('cookie_consent')

# Manually set consent
localStorage.setItem('cookie_consent', JSON.stringify({
  preferences: { necessary: true, analytics: true, marketing: false },
  timestamp: Date.now(),
  version: "1.0"
}))
```

## 📱 Responsive Breakpoints

- **Mobile**: < 600px (vertical buttons)
- **Tablet**: 600px - 900px (horizontal layout)
- **Desktop**: > 900px (full layout)

## 🎯 Common Use Cases

### Load GA4 on consent

```tsx
useEffect(() => {
  if (consent?.preferences.analytics) {
    loadGoogleAnalytics('G-XXXXXXXXXX');
  }
}, [consent]);
```

### Conditional rendering

```tsx
{consent?.preferences.analytics && <AnalyticsWidget />}
{consent?.preferences.marketing && <AdBanner />}
```

### Footer link

```tsx
<Button onClick={revokeConsent}>
  Cookie設定
</Button>
```

## ⚙️ Configuration

### localStorage key
```
cookie_consent
```

### Consent version
```typescript
const CONSENT_VERSION = '1.0';
```

### Default preferences
```typescript
{
  necessary: true,
  analytics: false,
  marketing: false
}
```

## 🔗 Policy Links

Update these in the components:

```tsx
<Link href="/privacy-policy">プライバシーポリシー</Link>
<Link href="/cookie-policy">Cookie ポリシー</Link>
```

## 🐛 Debug

### Check if banner should show

```javascript
const stored = localStorage.getItem('cookie_consent');
console.log('Stored consent:', stored);
console.log('Parsed:', JSON.parse(stored || '{}'));
```

### Force banner to show

```javascript
localStorage.removeItem('cookie_consent');
window.location.reload();
```

### Check GA consent mode

```javascript
console.log('DataLayer:', window.dataLayer);
```

## 📚 Documentation

- **Full Docs**: `/docs/COOKIE_CONSENT.md`
- **Examples**: `/docs/COOKIE_CONSENT_EXAMPLES.md`
- **Implementation**: `/docs/COOKIE_CONSENT_IMPLEMENTATION.md`
- **This Guide**: `/docs/COOKIE_CONSENT_QUICK_REFERENCE.md`

## ✅ Checklist

Before going to production:

- [ ] Create privacy policy page
- [ ] Create cookie policy page
- [ ] Add real GA4 measurement ID
- [ ] Test on all browsers
- [ ] Test on mobile devices
- [ ] Verify GDPR compliance
- [ ] Test consent persistence
- [ ] Test analytics loading

## 🆘 Common Issues

### Banner not showing
```bash
# Solution
localStorage.clear()
```

### Consent not saving
```bash
# Check quota
console.log('localStorage quota:', JSON.stringify(localStorage).length);
```

### GA not loading
```bash
# Check consent
console.log(hasAnalyticsConsent());
# Check script
console.log(document.querySelector('script[src*="googletagmanager"]'));
```

## 📞 Support

1. Check documentation
2. Inspect localStorage
3. Check browser console
4. Review code comments

---

**Version**: 1.0
**Updated**: 2025-12-07
