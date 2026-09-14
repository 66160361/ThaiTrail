import { useEffect, useState } from 'react';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import ToggleSwitch from './ToggleSwitch';

const CATEGORIES = [
  {
    key: 'necessary',
    title: 'คุกกี้จำเป็น (Necessary Cookies)',
    description:
      'จำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ เช่น การเข้าสู่ระบบและความปลอดภัยของบัญชี ไม่สามารถปิดการใช้งานได้',
    locked: true,
  },
  {
    key: 'functional',
    title: 'คุกกี้เพื่อการทำงาน (Functional Cookies)',
    description: 'ช่วยจดจำการตั้งค่าและความชอบของคุณ เพื่อมอบประสบการณ์ใช้งานที่สะดวกยิ่งขึ้น',
  },
  {
    key: 'analytics',
    title: 'คุกกี้เพื่อการวิเคราะห์ (Analytics Cookies)',
    description: 'ช่วยให้เราเข้าใจพฤติกรรมการใช้งานเว็บไซต์ เพื่อนำไปปรับปรุงบริการให้ดียิ่งขึ้น',
  },
  {
    key: 'personalization',
    title: 'คุกกี้เพื่อการปรับเนื้อหา (Personalization Cookies)',
    description: 'ใช้ปรับเนื้อหาและคำแนะนำสถานที่ท่องเที่ยวให้ตรงกับความสนใจของคุณมากยิ่งขึ้น',
  },
  {
    key: 'marketing',
    title: 'คุกกี้การตลาด (Marketing Cookies)',
    description: 'ใช้เพื่อนำเสนอโฆษณาและเนื้อหาทางการตลาดที่เกี่ยวข้องกับความสนใจของคุณ',
  },
];

export default function CookieSettingsModal() {
  const { consent, isSettingsOpen, closeSettings, savePreferences, acceptAll } = useCookieConsent();
  const [draft, setDraft] = useState(consent);

  useEffect(() => {
    if (isSettingsOpen) setDraft(consent);
  }, [isSettingsOpen, consent]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const toggle = (key) => setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="tt-cookie-modal-overlay" onClick={closeSettings}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ตั้งค่าคุกกี้"
        onClick={(event) => event.stopPropagation()}
        className="tt-cookie-modal"
      >
        <div className="tt-cookie-modal__header">
          <h2 className="tt-cookie-modal__title">ตั้งค่าความเป็นส่วนตัวของคุกกี้</h2>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="ปิดหน้าต่างตั้งค่าคุกกี้"
            className="tt-cookie-modal__close"
          >
            ✕
          </button>
        </div>

        <div className="tt-cookie-modal__body">
          <p className="tt-cookie-modal__intro">
            เลือกประเภทคุกกี้ที่ต้องการอนุญาตให้เว็บไซต์ใช้งาน คุณสามารถเปลี่ยนแปลงการตั้งค่านี้ได้ทุกเมื่อ
          </p>
          <div className="tt-cookie-category-list">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="tt-cookie-category">
                <div>
                  <p className="tt-cookie-category__title">{cat.title}</p>
                  <p className="tt-cookie-category__desc">{cat.description}</p>
                </div>
                <ToggleSwitch
                  checked={cat.locked ? true : !!draft[cat.key]}
                  disabled={cat.locked}
                  onChange={() => toggle(cat.key)}
                  label={cat.title}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="tt-cookie-modal__footer">
          <button type="button" onClick={closeSettings} className="tt-btn tt-btn-ghost">
            ยกเลิก
          </button>
          <button type="button" onClick={acceptAll} className="tt-btn tt-btn-outline">
            ยอมรับทั้งหมด
          </button>
          <button type="button" onClick={() => savePreferences(draft)} className="tt-btn tt-btn-primary">
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
