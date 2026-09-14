import { createContext, useCallback, useEffect, useState } from 'react';

export const COOKIE_CONSENT_STORAGE_KEY = 'cookie_consent';

export const DEFAULT_CONSENT = {
  necessary: true,
  functional: false,
  analytics: false,
  personalization: false,
  marketing: false,
};

export const CookieConsentContext = createContext(null);

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONSENT, ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readStoredConsent() ?? DEFAULT_CONSENT);
  const [hasResponded, setHasResponded] = useState(() => readStoredConsent() !== null);
  const [isBannerOpen, setIsBannerOpen] = useState(() => readStoredConsent() === null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const persist = useCallback((next) => {
    const payload = { ...DEFAULT_CONSENT, ...next, necessary: true, updatedAt: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
    setConsent(payload);
    setHasResponded(true);
    setIsBannerOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ necessary: true, functional: true, analytics: true, personalization: true, marketing: true });
    setIsSettingsOpen(false);
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({ necessary: true, functional: false, analytics: false, personalization: false, marketing: false });
    setIsSettingsOpen(false);
  }, [persist]);

  const savePreferences = useCallback((partial) => {
    persist({ ...consent, ...partial });
    setIsSettingsOpen(false);
  }, [consent, persist]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  useEffect(() => {
    // keep tabs in sync when consent changes in another tab/window
    function onStorage(event) {
      if (event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      const stored = readStoredConsent();
      if (stored) {
        setConsent(stored);
        setHasResponded(true);
        setIsBannerOpen(false);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = {
    consent,
    hasResponded,
    isBannerOpen,
    isSettingsOpen,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    openSettings,
    closeSettings,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}
