import { LocaleProvider } from "@/lib/locale-context";
import { buildPublicPageMetadata } from "@/lib/i18n/publicPageMetadata";
import ContactPageContent from "@/components/legal/ContactPageContent";

export const metadata = buildPublicPageMetadata({
  locale: "ko",
  jaPath: "/contact",
  titleKey: "legal.contact.title",
  descriptionKey: "legal.contact.description",
});

export default function KoContactPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <ContactPageContent />
    </LocaleProvider>
  );
}
