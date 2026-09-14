import { Link, useNavigate } from 'react-router-dom';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import {
  CONTACT_EMAIL,
  COMPANY_ADDRESS,
  COMPANY_NAME,
  CONTACT_PHONE,
  DPO_CONTACT,
  LAST_UPDATED_DATE,
} from '../../data/legalContent';

const CONTACT_FIELD_ROWS = {
  company: () => COMPANY_NAME,
  address: () => `ที่อยู่: ${COMPANY_ADDRESS}`,
  email: () => `อีเมล: ${CONTACT_EMAIL}`,
  phone: () => `โทรศัพท์: ${CONTACT_PHONE}`,
  dpo: () => `เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล: ${DPO_CONTACT}`,
  updated: () => `วันที่อัปเดตล่าสุด: ${LAST_UPDATED_DATE}`,
};

function renderBlock(block, key, openSettings) {
  if (block.type === 'p') {
    if (block.parts) {
      return (
        <p key={key}>
          {block.parts.map((part, i) => {
            if (typeof part === 'string') return part;
            if (part.kind === 'link') {
              return (
                <Link key={i} to={part.to} className="tt-legal-link">
                  {part.label}
                </Link>
              );
            }
            if (part.kind === 'action') {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={openSettings}
                  className="tt-legal-link tt-legal-link--inline"
                >
                  {part.label}
                </button>
              );
            }
            return null;
          })}
        </p>
      );
    }
    return <p key={key}>{block.text}</p>;
  }

  if (block.type === 'subheading') {
    return (
      <h3 key={key} className="tt-legal-subheading">
        {block.text}
      </h3>
    );
  }

  if (block.type === 'list') {
    return (
      <ul key={key}>
        {block.items.map((item, j) => (
          <li key={j}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'links') {
    return (
      <ul key={key}>
        {block.items.map((item) => (
          <li key={item.to ?? item.label}>
            {item.action === 'open-cookie-settings' ? (
              <button type="button" onClick={openSettings} className="tt-legal-link tt-legal-link--inline">
                {item.label}
              </button>
            ) : (
              <Link to={item.to} className="tt-legal-link">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === 'action' && block.action === 'open-cookie-settings') {
    return (
      <button key={key} type="button" onClick={openSettings} className="tt-btn tt-btn-primary">
        {block.label}
      </button>
    );
  }

  if (block.type === 'contact') {
    const fields = block.fields ?? ['company', 'address', 'email'];
    return (
      <ul key={key} className="tt-legal-contact-list">
        {fields.map((field) => (
          <li key={field}>{CONTACT_FIELD_ROWS[field]?.()}</li>
        ))}
      </ul>
    );
  }

  return null;
}

export default function LegalDocumentLayout({ title, subtitle, effectiveDate, intro, sections }) {
  const navigate = useNavigate();
  const { openSettings } = useCookieConsent();

  return (
    <div className="tt-legal-root">
      {/* Top bar: back button + breadcrumb */}
      <div className="tt-legal-topbar">
        <div className="tt-legal-topbar__inner">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="ย้อนกลับ"
            className="tt-legal-back"
          >
            ←
          </button>
          <p className="tt-legal-breadcrumb">
            <Link to="/">หน้าแรก</Link> {'>'} <strong>{title}</strong>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="tt-legal-hero">
        <div className="tt-legal-hero__inner">
          <h1 className="tt-legal-hero__title">{title}</h1>
          {subtitle && <p className="tt-legal-hero__subtitle">{subtitle}</p>}
          {effectiveDate && (
            <p className="tt-legal-hero__meta">มีผลบังคับใช้ตั้งแต่วันที่ {effectiveDate}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="tt-legal-content">
        {intro?.length > 0 && (
          <div className="tt-legal-intro">
            {intro.map((block, i) => renderBlock(block, `intro-${i}`, openSettings))}
          </div>
        )}

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="tt-legal-section">
            <h2 className="tt-legal-section__title">{section.title}</h2>

            {section.blocks.map((block, i) => renderBlock(block, i, openSettings))}
          </section>
        ))}
      </main>
    </div>
  );
}
