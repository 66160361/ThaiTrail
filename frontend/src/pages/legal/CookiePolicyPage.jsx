import LegalDocumentLayout from './LegalDocumentLayout';
import { COOKIE_POLICY_SECTIONS, COOKIE_POLICY_META, EFFECTIVE_DATE } from '../../data/legalContent';

export default function CookiePolicyPage() {
  return (
    <LegalDocumentLayout
      title={COOKIE_POLICY_META.title}
      intro={COOKIE_POLICY_META.intro}
      effectiveDate={EFFECTIVE_DATE}
      sections={COOKIE_POLICY_SECTIONS}
    />
  );
}
