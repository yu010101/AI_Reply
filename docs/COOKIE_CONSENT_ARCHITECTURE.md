# Cookie Consent - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        _app.tsx                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  <AuthProvider>                                         │    │
│  │    <Component {...pageProps} />                         │    │
│  │    <CookieConsent />  ← Always rendered                 │    │
│  │  </AuthProvider>                                        │    │
│  │                                                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              CookieConsent Component                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  useCookieConsent()  ← State management hook            │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────┐      │    │
│  │  │ Banner (AnimatePresence)                      │      │    │
│  │  │  - Shows if no consent                        │      │    │
│  │  │  - Smooth slide-in animation                  │      │    │
│  │  │  - 3 buttons: すべて許可 | 必要のみ | 設定    │      │    │
│  │  └──────────────────────────────────────────────┘      │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────┐      │    │
│  │  │ Settings Dialog                               │      │    │
│  │  │  - 必須Cookie (disabled toggle)               │      │    │
│  │  │  - 分析Cookie (toggle)                        │      │    │
│  │  │  - マーケティングCookie (toggle)              │      │    │
│  │  │  - Save / Cancel buttons                      │      │    │
│  │  └──────────────────────────────────────────────┘      │    │
│  │                                                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              useCookieConsent Hook                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  State:                                                 │    │
│  │    - consent: CookieConsent | null                      │    │
│  │    - showBanner: boolean                                │    │
│  │    - isLoading: boolean                                 │    │
│  │                                                          │    │
│  │  Functions:                                             │    │
│  │    - acceptAll()                                        │    │
│  │    - acceptNecessaryOnly()                              │    │
│  │    - updatePreferences(prefs)                           │    │
│  │    - revokeConsent()                                    │    │
│  │                                                          │    │
│  │  Storage:                                               │    │
│  │    - localStorage key: 'cookie_consent'                 │    │
│  │                                                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    localStorage                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  {                                                       │    │
│  │    "preferences": {                                     │    │
│  │      "necessary": true,                                 │    │
│  │      "analytics": boolean,                              │    │
│  │      "marketing": boolean                               │    │
│  │    },                                                    │    │
│  │    "timestamp": 1733558400000,                          │    │
│  │    "version": "1.0"                                     │    │
│  │  }                                                       │    │
│  │                                                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow Diagram

```
                    ┌─────────────┐
                    │  User lands │
                    │  on site    │
                    └──────┬──────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Check consent  │
                  │ in localStorage│
                  └────────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ Consent     │          │ No consent  │
       │ exists      │          │ found       │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              │                        ▼
              │              ┌──────────────────┐
              │              │ Show banner      │
              │              │ (slide in)       │
              │              └────────┬─────────┘
              │                       │
              │         ┌─────────────┼─────────────┐
              │         │             │             │
              │         ▼             ▼             ▼
              │  ┌───────────┐ ┌───────────┐ ┌──────────┐
              │  │すべて許可 │ │必要のみ   │ │設定      │
              │  └─────┬─────┘ └─────┬─────┘ └────┬─────┘
              │        │             │            │
              │        ▼             ▼            ▼
              │  ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  │Accept all│ │Accept    │ │Open      │
              │  │cookies   │ │necessary │ │settings  │
              │  └─────┬────┘ └─────┬────┘ └────┬─────┘
              │        │            │            │
              │        │            │            ▼
              │        │            │     ┌──────────────┐
              │        │            │     │ Toggle       │
              │        │            │     │ preferences  │
              │        │            │     └──────┬───────┘
              │        │            │            │
              │        │            │            ▼
              │        │            │     ┌──────────────┐
              │        │            │     │ Save         │
              │        │            │     └──────┬───────┘
              │        │            │            │
              │        └────────────┴────────────┘
              │                     │
              │                     ▼
              │            ┌──────────────────┐
              │            │ Save to          │
              │            │ localStorage     │
              │            └────────┬─────────┘
              │                     │
              │                     ▼
              │            ┌──────────────────┐
              │            │ Apply consent    │
              │            │ settings         │
              │            └────────┬─────────┘
              │                     │
              └─────────────────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Load features    │
                           │ based on consent │
                           └────────┬─────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
         ┌──────────┐        ┌──────────┐       ┌──────────┐
         │Necessary │        │Analytics │       │Marketing │
         │(always)  │        │(if OK)   │       │(if OK)   │
         └──────────┘        └──────────┘       └──────────┘
```

## Component Hierarchy

```
_app.tsx
  └── CookieConsent
       ├── useCookieConsent (hook)
       │    ├── useState (consent, showBanner, isLoading)
       │    ├── useEffect (load from localStorage)
       │    ├── acceptAll()
       │    ├── acceptNecessaryOnly()
       │    ├── updatePreferences()
       │    └── revokeConsent()
       │
       ├── Banner (framer-motion)
       │    ├── CookieIcon
       │    ├── Typography (explanation)
       │    ├── Button (すべて許可)
       │    ├── Button (必要なCookieのみ)
       │    └── Button (設定)
       │
       └── Settings Dialog
            ├── DialogTitle
            ├── DialogContent
            │    ├── Necessary Cookie (Switch - disabled)
            │    ├── Analytics Cookie (Switch)
            │    └── Marketing Cookie (Switch)
            └── DialogActions
                 ├── Button (キャンセル)
                 └── Button (保存)
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     User Action                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              useCookieConsent Hook                            │
│                                                                │
│  acceptAll() or acceptNecessaryOnly() or updatePreferences()  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  saveConsent()                                │
│                                                                │
│  1. Create CookieConsent object                              │
│  2. Save to localStorage                                     │
│  3. Update state (setConsent)                                │
│  4. Hide banner (setShowBanner(false))                       │
│  5. Apply consent settings                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              applyConsentSettings()                           │
│                                                                │
│  if (analytics === true)                                     │
│    → enableGoogleAnalytics()                                 │
│  else                                                         │
│    → disableGoogleAnalytics()                                │
│                                                                │
│  if (marketing === true)                                     │
│    → enableMarketingCookies()                                │
│  else                                                         │
│    → disableMarketingCookies()                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                Google Analytics                               │
│                                                                │
│  window.gtag('consent', 'update', {                          │
│    analytics_storage: 'granted' / 'denied',                  │
│    ad_storage: 'granted' / 'denied',                         │
│    ...                                                        │
│  })                                                           │
└──────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                  useCookieConsent State                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  consent: CookieConsent | null                               │
│  ├── preferences                                             │
│  │   ├── necessary: true (always)                            │
│  │   ├── analytics: boolean                                  │
│  │   └── marketing: boolean                                  │
│  ├── timestamp: number                                       │
│  └── version: string                                         │
│                                                               │
│  showBanner: boolean                                         │
│  ├── true: Show banner                                       │
│  └── false: Hide banner                                      │
│                                                               │
│  isLoading: boolean                                          │
│  ├── true: Loading from localStorage                         │
│  └── false: Ready                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Consent Lifecycle

```
1. Mount
   ↓
2. useEffect (load from localStorage)
   ↓
3. Parse stored consent
   ├── Valid consent → setConsent, hide banner
   ├── No consent → show banner
   └── Version mismatch → show banner
   ↓
4. User interaction
   ├── Accept All → Save all=true
   ├── Necessary Only → Save analytics=false, marketing=false
   └── Settings → User chooses, then save
   ↓
5. Apply consent
   ├── Update GA consent mode
   ├── Load/unload scripts
   └── Set cookies
   ↓
6. Persist to localStorage
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                     Application                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ _app.tsx                                         │        │
│  │  - Renders CookieConsent                        │        │
│  │  - Initializes GA consent mode (optional)       │        │
│  │  - Loads GA script after consent (optional)     │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Any Component                                    │        │
│  │  - useCookieConsent() for state                │        │
│  │  - hasAnalyticsConsent() for checks             │        │
│  │  - trackEvent() for tracking                    │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Settings Page                                    │        │
│  │  - CookieSettingsPanel component                │        │
│  │  - Allows user to update preferences            │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Footer                                           │        │
│  │  - revokeConsent() to show banner again         │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
pages/_app.tsx
  ↓
  imports CookieConsent
           ↓
           src/components/legal/CookieConsent.tsx
                 ↓
                 imports useCookieConsent
                          ↓
                          src/hooks/useCookieConsent.ts
                                ↓
                                uses localStorage
                                applies consent to window.gtag

Any Component
  ↓
  imports utility functions
           ↓
           src/utils/cookieConsent.ts
                 ↓
                 getCookieConsent() → reads localStorage
                 hasAnalyticsConsent() → checks consent
                 trackEvent() → calls window.gtag
                 loadGoogleAnalytics() → loads GA script
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                     Performance                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Initial Load:                                               │
│    - localStorage read: < 5ms                                │
│    - Component render: < 50ms                                │
│    - Animation: 300ms (smooth)                               │
│                                                               │
│  Banner Size:                                                │
│    - JavaScript: ~15KB (gzipped)                             │
│    - No external dependencies beyond MUI + framer-motion     │
│                                                               │
│  User Interaction:                                           │
│    - localStorage write: < 5ms                               │
│    - State update: < 10ms                                    │
│    - Banner hide animation: 300ms                            │
│                                                               │
│  Analytics Loading:                                          │
│    - GA script: ~50KB (loaded only with consent)             │
│    - Consent mode overhead: minimal                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Component Security                                       │
│     - MUI components (XSS protection)                        │
│     - No dangerouslySetInnerHTML                             │
│     - Controlled inputs only                                 │
│                                                               │
│  2. Data Security                                            │
│     - localStorage only (not sent to server)                 │
│     - No sensitive data stored                               │
│     - Version control for schema changes                     │
│                                                               │
│  3. Script Loading                                           │
│     - Scripts loaded only with consent                       │
│     - HTTPS required in production                           │
│     - SameSite=None;Secure flags                             │
│                                                               │
│  4. GDPR Compliance                                          │
│     - Explicit consent required                              │
│     - Granular controls                                      │
│     - Easy withdrawal                                        │
│     - Clear information                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

**Version**: 1.0
**Last Updated**: 2025-12-07
**Architecture**: React Hooks + localStorage + Consent Mode
