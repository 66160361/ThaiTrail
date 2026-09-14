import CookieBanner from './CookieBanner';
import CookieSettingsModal from './CookieSettingsModal';

// Mounted once at the app root so the banner/modal are available on every route.
export default function CookieConsentManager() {
  return (
    <>
      <CookieBanner />
      <CookieSettingsModal />
    </>
  );
}
