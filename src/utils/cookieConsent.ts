/**
 * Cookie Consent Utilities
 *
 * Helper functions to check cookie consent status throughout the application.
 * Use these functions to conditionally enable/disable features based on user consent.
 */

import { CookieConsent } from '@/hooks/useCookieConsent';

const CONSENT_KEY = 'cookie_consent';

/**
 * Get the current cookie consent from localStorage
 */
export const getCookieConsent = (): CookieConsent | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to get cookie consent:', error);
  }
  return null;
};

/**
 * Check if user has consented to analytics cookies
 */
export const hasAnalyticsConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.preferences.analytics ?? false;
};

/**
 * Check if user has consented to marketing cookies
 */
export const hasMarketingConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.preferences.marketing ?? false;
};

/**
 * Check if user has given any consent (necessary cookies are always enabled)
 */
export const hasAnyConsent = (): boolean => {
  return getCookieConsent() !== null;
};

/**
 * Initialize Google Analytics with consent mode
 * Call this in your _app.tsx or _document.tsx before loading GA script
 */
export const initializeGoogleAnalyticsConsent = () => {
  if (typeof window === 'undefined') return;

  // Set default consent to 'denied' as a placeholder
  // Consent will be updated once user makes a choice
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });

  // Check if user has already given consent
  const consent = getCookieConsent();
  if (consent) {
    gtag('consent', 'update', {
      analytics_storage: consent.preferences.analytics ? 'granted' : 'denied',
      ad_storage: consent.preferences.marketing ? 'granted' : 'denied',
      ad_user_data: consent.preferences.marketing ? 'granted' : 'denied',
      ad_personalization: consent.preferences.marketing ? 'granted' : 'denied',
    });
  }
};

/**
 * Load Google Analytics script (only if consent is given)
 * @param measurementId - Your GA4 Measurement ID (e.g., 'G-XXXXXXXXXX')
 */
export const loadGoogleAnalytics = (measurementId: string) => {
  if (typeof window === 'undefined') return;

  const consent = getCookieConsent();
  if (!consent?.preferences.analytics) {
    console.log('Google Analytics not loaded: User has not consented to analytics cookies');
    return;
  }

  // Load GA4 script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true, // GDPR compliance
      cookie_flags: 'SameSite=None;Secure', // Security
    });

    console.log('Google Analytics loaded successfully');
  };
};

/**
 * Track custom events (only if analytics consent is given)
 * @param eventName - Name of the event
 * @param eventParams - Event parameters
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  if (!hasAnalyticsConsent()) {
    console.log(`Event not tracked: "${eventName}" - User has not consented to analytics cookies`);
    return;
  }

  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

/**
 * Track page views (only if analytics consent is given)
 * @param url - Page URL
 * @param title - Page title
 */
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined') return;

  if (!hasAnalyticsConsent()) {
    return;
  }

  if ((window as any).gtag) {
    (window as any).gtag('config', (window as any).GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    });
  }
};
