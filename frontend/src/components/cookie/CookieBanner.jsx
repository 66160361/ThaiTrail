import { Link } from 'react-router-dom';
import { useCookieConsent } from '../../hooks/useCookieConsent';

export default function CookieBanner() {
  const { isBannerOpen, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();

  if (!isBannerOpen) return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="การตั้งค่าคุกกี้" className="tt-cookie-banner">
      <div className="tt-cookie-banner__inner">
        <p className="tt-cookie-banner__text">
          เว็บไซต์นี้มีการเก็บข้อมูลการใช้งานและพฤติกรรมการใช้งาน เช่น หน้าที่เข้าชม การคลิก การค้นหา
          อุปกรณ์ และคุกกี้ เพื่อนำไปวิเคราะห์ ปรับปรุงบริการ และปรับเนื้อหาให้เหมาะกับความสนใจของคุณมากยิ่งขึ้น
          รายละเอียดเพิ่มเติมดูได้ที่{' '}
          <Link to="/privacy" className="tt-cookie-banner__link">
            นโยบายความเป็นส่วนตัว
          </Link>{' '}
          และ{' '}
          <Link to="/cookie-policy" className="tt-cookie-banner__link">
            นโยบายคุกกี้
          </Link>
        </p>

        <div className="tt-cookie-banner__actions">
          <button type="button" onClick={rejectNonEssential} className="tt-btn tt-btn-ghost">
            ปฏิเสธคุกกี้ที่ไม่จำเป็น
          </button>
          <button type="button" onClick={openSettings} className="tt-btn tt-btn-outline">
            ตั้งค่าคุกกี้
          </button>
          <button type="button" onClick={acceptAll} className="tt-btn tt-btn-primary">
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
