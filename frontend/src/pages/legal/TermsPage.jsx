import LegalDocumentLayout from './LegalDocumentLayout';
import { TERMS_SECTIONS, TERMS_META, EFFECTIVE_DATE } from '../../data/legalContent';

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title={TERMS_META.title}
      subtitle={TERMS_META.subtitle}
      intro={TERMS_META.intro}
      effectiveDate={EFFECTIVE_DATE}
      sections={TERMS_SECTIONS}
    />
  );
}
