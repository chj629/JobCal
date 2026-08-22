import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import LoginPageContent from "@/components/auth/LoginPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/login",
  titleKey: "auth.login.title",
  descriptionKey: "auth.login.description",
});

export default function KoLoginPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <LoginPageContent />
    </LocaleProvider>
  );
}
