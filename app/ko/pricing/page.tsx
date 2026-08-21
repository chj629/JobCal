import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import PricingPageContent from "@/components/pricing/PricingPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/pricing",
  titleKey: "pricing.title",
  descriptionKey: "pricing.description",
});

export default function KoPricingPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <PricingPageContent />
    </LocaleProvider>
  );
}
