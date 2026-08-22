import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import ForgotPasswordPageContent from "@/components/auth/ForgotPasswordPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/forgot-password",
  titleKey: "auth.forgotPassword.title",
  descriptionKey: "auth.forgotPassword.description",
});

export default function KoForgotPasswordPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <ForgotPasswordPageContent />
    </LocaleProvider>
  );
}
