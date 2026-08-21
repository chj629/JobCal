import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import TermsPageContent from "@/components/legal/TermsPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/terms",
  titleKey: "legal.terms.title",
  descriptionKey: "legal.terms.intro",
});

export default function KoTermsPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <TermsPageContent />
    </LocaleProvider>
  );
}
