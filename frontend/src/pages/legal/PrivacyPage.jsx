import LegalDocumentLayout from './LegalDocumentLayout';
import { PRIVACY_SECTIONS, PRIVACY_META, EFFECTIVE_DATE } from '../../data/legalContent';

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title={PRIVACY_META.title}
      intro={PRIVACY_META.intro}
      effectiveDate={EFFECTIVE_DATE}
      sections={PRIVACY_SECTIONS}
    />
  );
}
