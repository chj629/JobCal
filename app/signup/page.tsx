import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import SignupPageContent from "@/components/auth/SignupPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ja",
  jaPath: "/signup",
  titleKey: "auth.signup.title",
  descriptionKey: "auth.signup.description",
});

export default function SignupPage() {
  return (
    <LocaleProvider initialLocale="ja" locked>
      <SignupPageContent />
    </LocaleProvider>
  );
}
