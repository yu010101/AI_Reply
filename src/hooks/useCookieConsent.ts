import { useState, useEffect, useCallback } from 'react';

export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsent {
  preferences: CookiePreferences;
  timestamp: number;
  version: string; // For tracking consent version changes
}

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const parsed: CookieConsent = JSON.parse(stored);
        // Check if consent version matches
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed);
          setShowBanner(false);
        } else {
          // Version mismatch - show banner again
          setShowBanner(true);
        }
      } else {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Failed to load cookie consent:', error);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save consent to localStorage
  const saveConsent = useCallback((preferences: CookiePreferences) => {
    const newConsent: CookieConsent = {
      preferences,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };

    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
      setShowBanner(false);

      // Apply consent settings
      applyConsentSettings(preferences);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }, []);

  // Accept all cookies
  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  }, [saveConsent]);

  // Accept only necessary cookies
  const acceptNecessaryOnly = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  }, [saveConsent]);

  // Update specific preferences
  const updatePreferences = useCallback(
    (preferences: CookiePreferences) => {
      saveConsent(preferences);
    },
    [saveConsent]
  );

  // Revoke consent (for testing or user request)
  const revokeConsent = useCallback(() => {
    try {
      localStorage.removeItem(CONSENT_KEY);
      setConsent(null);
      setShowBanner(true);

      // Clear analytics cookies if they were set
      clearAnalyticsCookies();
    } catch (error) {
      console.error('Failed to revoke consent:', error);
    }
  }, []);

  return {
    consent,
    showBanner,
    isLoading,
    acceptAll,
    acceptNecessaryOnly,
    updatePreferences,
    revokeConsent,
    hasConsent: consent !== null,
  };
};

// Apply consent settings (integrate with analytics tools)
function applyConsentSettings(preferences: CookiePreferences) {
  // Google Analytics
  if (preferences.analytics) {
    enableGoogleAnalytics();
  } else {
    disableGoogleAnalytics();
  }

  // Marketing cookies (e.g., Facebook Pixel, LinkedIn Insight Tag)
  if (preferences.marketing) {
    enableMarketingCookies();
  } else {
    disableMarketingCookies();
  }
}

function enableGoogleAnalytics() {
  // Enable GA4 if gtag is available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }
}

function disableGoogleAnalytics() {
  // Disable GA4 if gtag is available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: 'denied',
    });
  }
}

function enableMarketingCookies() {
  // Enable marketing cookies
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  }
}

function disableMarketingCookies() {
  // Disable marketing cookies
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}

function clearAnalyticsCookies() {
  // Clear Google Analytics cookies
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    const cookieName = cookie.split('=')[0].trim();

    // Clear GA cookies
    if (
      cookieName.startsWith('_ga') ||
      cookieName.startsWith('_gid') ||
      cookieName.startsWith('_gat')
    ) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }
}
