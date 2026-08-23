import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import LoginPageContent from "@/components/auth/LoginPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ja",
  jaPath: "/login",
  titleKey: "auth.login.title",
  descriptionKey: "auth.login.description",
});

export default function LoginPage() {
  return (
    <LocaleProvider initialLocale="ja" locked>
      <LoginPageContent />
    </LocaleProvider>
  );
}
