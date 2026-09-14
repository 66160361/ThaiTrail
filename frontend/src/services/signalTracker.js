import { api } from './api';

const CONSENT_STORAGE_KEY = 'cookie_consent';

// อ่านค่า consent ล่าสุดจาก localStorage (ที่เก็บโดย CookieConsentContext)
function readConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// ผู้ใช้ต้องยินยอมคุกกี้เพื่อการวิเคราะห์หรือการปรับเนื้อหา อย่างน้อยหนึ่งประเภท
// จึงจะเก็บพฤติกรรมการใช้งาน (view/like/save/share/dwell time) ได้
export function hasSignalConsent() {
  const consent = readConsent();
  return Boolean(consent.personalization || consent.analytics);
}

// บันทึก Dwell Time หรือ Click ของผู้ใช้ไปยัง backend
// หากผู้ใช้ยังไม่กดยินยอม หรือปฏิเสธไว้ -> ยุติการทำงานทันที ไม่ส่งข้อมูลไปเซิร์ฟเวอร์
export function trackUserSignal(payload) {
  if (!hasSignalConsent()) return;

  return api.signals.log(payload).catch(() => { });
}
