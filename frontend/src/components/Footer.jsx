import { Link } from 'react-router-dom';
import { MessageSquare, Settings2 } from 'lucide-react';
import { useCookieConsent } from '../hooks/useCookieConsent';

const POLICY_LINKS = [
  { to: '/terms', label: 'ข้อกำหนดการให้บริการเว็บไซต์ (Terms of Service)' },
  { to: '/privacy', label: 'นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)' },
  { to: '/cookie-policy', label: 'นโยบายคุกกี้ (Cookie Policy)' },
];

export default function Footer() {
  const { openSettings } = useCookieConsent();

  return (
    <footer className="tt-footer">
      <div className="tt-footer__inner">
        <h3 className="tt-footer__heading">ข้อกำหนดและนโยบาย</h3>
        <ul className="tt-footer__links">
          {POLICY_LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className="tt-footer__link">
                <MessageSquare size={16} className="tt-footer__link-icon" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={openSettings} className="tt-footer__link">
              <Settings2 size={16} className="tt-footer__link-icon" />
              <span>ตั้งค่าคุกกี้</span>
            </button>
          </li>
        </ul>

        <div className="tt-footer__bottom">© 2569 ThaiTrail. สงวนลิขสิทธิ์ทั้งหมด</div>
      </div>
    </footer>
  );
}
