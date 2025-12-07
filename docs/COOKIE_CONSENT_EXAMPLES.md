# Cookie Consent - Implementation Examples

This document provides practical examples of how to use the Cookie Consent system in your application.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Settings Page Integration](#settings-page-integration)
- [Conditional Feature Loading](#conditional-feature-loading)
- [Google Analytics Integration](#google-analytics-integration)
- [Custom Event Tracking](#custom-event-tracking)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Usage

The Cookie Consent banner is automatically shown to users on their first visit. No additional setup is required beyond importing it in `_app.tsx`.

```tsx
// pages/_app.tsx
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

---

## Settings Page Integration

Create a settings page where users can manage their cookie preferences:

```tsx
// pages/settings/privacy.tsx
import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { CookieSettingsPanel } from '@/components/legal/CookieSettingsPanel';
import Layout from '@/components/layout/Layout';

export default function PrivacySettingsPage() {
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          プライバシー設定
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          個人情報とCookieの設定を管理できます
        </Typography>

        <CookieSettingsPanel />
      </Container>
    </Layout>
  );
}
```

---

## Conditional Feature Loading

Load features based on user consent:

### Example 1: Google Analytics

```tsx
// pages/_app.tsx
import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { loadGoogleAnalytics, initializeGoogleAnalyticsConsent } from '@/utils/cookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  const { consent, isLoading } = useCookieConsent();

  useEffect(() => {
    // Initialize consent mode
    initializeGoogleAnalyticsConsent();
  }, []);

  useEffect(() => {
    if (!isLoading && consent?.preferences.analytics) {
      // Load GA only if user consented
      loadGoogleAnalytics('G-XXXXXXXXXX');
    }
  }, [consent, isLoading]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
```

### Example 2: Facebook Pixel

```tsx
// components/FacebookPixel.tsx
import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export const FacebookPixel: React.FC<{ pixelId: string }> = ({ pixelId }) => {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent?.preferences.marketing) {
      // Load Facebook Pixel
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(
        window,
        document,
        'script',
        'https://connect.facebook.net/en_US/fbevents.js'
      );

      (window as any).fbq('init', pixelId);
      (window as any).fbq('track', 'PageView');
    }
  }, [consent, pixelId]);

  return null;
};

// Usage in _app.tsx
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
      <FacebookPixel pixelId="YOUR_PIXEL_ID" />
    </AuthProvider>
  );
}
```

### Example 3: Chat Widget (Marketing)

```tsx
// components/ChatWidget.tsx
import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export const ChatWidget: React.FC = () => {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent?.preferences.marketing) {
      // Load Intercom, Drift, or other chat widgets
      const script = document.createElement('script');
      script.src = 'https://widget.intercom.io/widget/YOUR_APP_ID';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [consent]);

  return null;
};
```

---

## Google Analytics Integration

Complete GA4 integration with consent mode:

### Step 1: Initialize Consent Mode

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* Google Tag Manager - Consent Mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### Step 2: Load GA After Consent

```tsx
// pages/_app.tsx
import { useEffect } from 'react';
import Script from 'next/script';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

function MyApp({ Component, pageProps }: AppProps) {
  const { consent } = useCookieConsent();
  const [loadGA, setLoadGA] = useState(false);

  useEffect(() => {
    if (consent?.preferences.analytics) {
      setLoadGA(true);

      // Update consent
      if ((window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    }
  }, [consent]);

  return (
    <>
      {loadGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure'
              });
            `}
          </Script>
        </>
      )}
      <AuthProvider>
        <Component {...pageProps} />
        <CookieConsent />
      </AuthProvider>
    </>
  );
}
```

### Step 3: Track Page Views

```tsx
// pages/_app.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { trackPageView } from '@/utils/cookieConsent';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
```

---

## Custom Event Tracking

Track custom events throughout your application:

### Example 1: Button Clicks

```tsx
// components/SignUpButton.tsx
import { Button } from '@mui/material';
import { trackEvent } from '@/utils/cookieConsent';

export const SignUpButton: React.FC = () => {
  const handleClick = () => {
    // Track event (automatically checks consent)
    trackEvent('signup_button_click', {
      button_location: 'header',
      timestamp: Date.now(),
    });

    // Your signup logic here
    router.push('/signup');
  };

  return (
    <Button variant="contained" onClick={handleClick}>
      Sign Up
    </Button>
  );
};
```

### Example 2: Form Submissions

```tsx
// components/ContactForm.tsx
import { useState } from 'react';
import { trackEvent } from '@/utils/cookieConsent';

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track form submission
    trackEvent('contact_form_submit', {
      form_name: 'contact',
      has_message: formData.message.length > 0,
    });

    // Submit form
    await submitContactForm(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### Example 3: Video Views

```tsx
// components/VideoPlayer.tsx
import { useRef, useEffect } from 'react';
import { trackEvent } from '@/utils/cookieConsent';

export const VideoPlayer: React.FC<{ videoId: string }> = ({ videoId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tracked25, setTracked25] = useState(false);
  const [tracked50, setTracked50] = useState(false);
  const [tracked75, setTracked75] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;

      if (progress >= 25 && !tracked25) {
        trackEvent('video_progress', { video_id: videoId, progress: 25 });
        setTracked25(true);
      }
      if (progress >= 50 && !tracked50) {
        trackEvent('video_progress', { video_id: videoId, progress: 50 });
        setTracked50(true);
      }
      if (progress >= 75 && !tracked75) {
        trackEvent('video_progress', { video_id: videoId, progress: 75 });
        setTracked75(true);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoId, tracked25, tracked50, tracked75]);

  return <video ref={videoRef} src={`/videos/${videoId}.mp4`} controls />;
};
```

---

## Advanced Patterns

### Pattern 1: Consent-Aware Hook

Create a custom hook that checks consent before executing:

```tsx
// hooks/useAnalytics.ts
import { useCallback } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { trackEvent as baseTrackEvent } from '@/utils/cookieConsent';

export const useAnalytics = () => {
  const { consent } = useCookieConsent();

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (consent?.preferences.analytics) {
        baseTrackEvent(eventName, params);
      }
    },
    [consent]
  );

  const trackPageView = useCallback(
    (url: string, title?: string) => {
      if (consent?.preferences.analytics && (window as any).gtag) {
        (window as any).gtag('config', (window as any).GA_MEASUREMENT_ID, {
          page_path: url,
          page_title: title,
        });
      }
    },
    [consent]
  );

  return {
    trackEvent,
    trackPageView,
    isEnabled: consent?.preferences.analytics ?? false,
  };
};

// Usage
function MyComponent() {
  const { trackEvent, isEnabled } = useAnalytics();

  const handleClick = () => {
    trackEvent('button_click', { button_id: 'submit' });
  };

  return (
    <div>
      <button onClick={handleClick}>Click Me</button>
      {isEnabled && <p>Analytics is enabled</p>}
    </div>
  );
}
```

### Pattern 2: Consent Banner Trigger

Add a button to show the consent banner again:

```tsx
// components/CookiePreferencesButton.tsx
import { Button } from '@mui/material';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export const CookiePreferencesButton: React.FC = () => {
  const { revokeConsent } = useCookieConsent();

  const handleClick = () => {
    // Revoke consent to show banner again
    revokeConsent();
  };

  return (
    <Button variant="text" size="small" onClick={handleClick}>
      Cookie設定を変更
    </Button>
  );
};

// Usage in footer
function Footer() {
  return (
    <footer>
      <CookiePreferencesButton />
      <Link href="/privacy-policy">プライバシーポリシー</Link>
      <Link href="/cookie-policy">Cookie ポリシー</Link>
    </footer>
  );
}
```

### Pattern 3: Feature Flag with Consent

Combine feature flags with cookie consent:

```tsx
// hooks/useFeatureWithConsent.ts
import { useCookieConsent } from '@/hooks/useCookieConsent';

interface FeatureConfig {
  requiresAnalytics?: boolean;
  requiresMarketing?: boolean;
}

export const useFeatureWithConsent = (
  featureName: string,
  config: FeatureConfig = {}
) => {
  const { consent } = useCookieConsent();

  const isEnabled = () => {
    // Check if feature is enabled in feature flags
    const featureEnabled = getFeatureFlag(featureName);
    if (!featureEnabled) return false;

    // Check consent requirements
    if (config.requiresAnalytics && !consent?.preferences.analytics) {
      return false;
    }
    if (config.requiresMarketing && !consent?.preferences.marketing) {
      return false;
    }

    return true;
  };

  return isEnabled();
};

// Usage
function Dashboard() {
  const showRecommendations = useFeatureWithConsent('recommendations', {
    requiresAnalytics: true,
    requiresMarketing: true,
  });

  return (
    <div>
      <h1>Dashboard</h1>
      {showRecommendations && <RecommendationsWidget />}
    </div>
  );
}
```

### Pattern 4: Server-Side Consent Check

Check consent in API routes:

```tsx
// pages/api/track.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get consent from cookie or header
  const consentCookie = req.cookies.cookie_consent;

  if (!consentCookie) {
    return res.status(403).json({ error: 'No consent provided' });
  }

  try {
    const consent = JSON.parse(consentCookie);

    if (!consent.preferences.analytics) {
      return res.status(403).json({ error: 'Analytics consent not given' });
    }

    // Track event server-side
    await trackServerSideEvent(req.body);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process consent' });
  }
}
```

---

## Testing Examples

### Test Cookie Consent Flow

```tsx
// __tests__/CookieConsent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CookieConsent } from '@/components/legal/CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('shows banner on first visit', () => {
    render(<CookieConsent />);
    expect(screen.getByText('Cookieの使用について')).toBeInTheDocument();
  });

  test('accepts all cookies', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByText('すべて許可'));

    const consent = JSON.parse(localStorage.getItem('cookie_consent') || '{}');
    expect(consent.preferences.analytics).toBe(true);
    expect(consent.preferences.marketing).toBe(true);
  });

  test('accepts only necessary cookies', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByText('必要なCookieのみ'));

    const consent = JSON.parse(localStorage.getItem('cookie_consent') || '{}');
    expect(consent.preferences.analytics).toBe(false);
    expect(consent.preferences.marketing).toBe(false);
  });
});
```

---

**Last Updated:** 2025-12-07
