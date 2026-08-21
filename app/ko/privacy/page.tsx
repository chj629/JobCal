import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import PrivacyPageContent from "@/components/legal/PrivacyPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/privacy",
  titleKey: "legal.privacy.title",
  descriptionKey: "legal.privacy.intro",
});

export default function KoPrivacyPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <PrivacyPageContent />
    </LocaleProvider>
  );
}
