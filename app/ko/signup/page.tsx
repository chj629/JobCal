import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import SignupPageContent from "@/components/auth/SignupPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/signup",
  titleKey: "auth.signup.title",
  descriptionKey: "auth.signup.description",
});

export default function KoSignupPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <SignupPageContent />
    </LocaleProvider>
  );
}
