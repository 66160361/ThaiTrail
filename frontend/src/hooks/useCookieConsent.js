import { useContext } from 'react';
import { CookieConsentContext } from '../context/CookieConsentContext';

// Reads/updates cookie consent; other services (e.g. analytics/tracking)
// should check the relevant boolean here before firing any events.
export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }

  const { consent } = ctx;

  return {
    ...ctx,
    necessary: consent.necessary,
    functional: consent.functional,
    analytics: consent.analytics,
    personalization: consent.personalization,
    marketing: consent.marketing,
  };
}
