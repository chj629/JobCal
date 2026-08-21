import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import RefundPolicyPageContent from "@/components/legal/RefundPolicyPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/refund-policy",
  titleKey: "legal.refundPolicy.title",
  descriptionKey: "legal.refundPolicy.intro",
});

export default function KoRefundPolicyPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <RefundPolicyPageContent />
    </LocaleProvider>
  );
}
