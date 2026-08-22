import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import AuthConfirmedPageContent from "@/components/auth/AuthConfirmedPageContent";

// app/auth/confirmed/page.tsx와 동일한 이유로 messageLine1을 description으로 재사용한다.
export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/auth/confirmed",
  titleKey: "auth.confirmed.title",
  descriptionKey: "auth.confirmed.messageLine1",
});

export default function KoAuthConfirmedPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <AuthConfirmedPageContent />
    </LocaleProvider>
  );
}
