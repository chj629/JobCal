import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import TokushohoPageContent from "@/components/legal/TokushohoPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/tokushoho",
  titleKey: "legal.tokushoho.title",
  descriptionKey: "legal.tokushoho.intro",
});

export default function KoTokushohoPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <TokushohoPageContent />
    </LocaleProvider>
  );
}
