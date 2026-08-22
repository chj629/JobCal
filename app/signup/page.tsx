import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import { buildBrowserLocaleRedirectScript } from "@/lib/i18n/browserLocaleRedirectScript";
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
      <Script id="browser-locale-redirect" strategy="beforeInteractive">
        {buildBrowserLocaleRedirectScript("/ko/signup")}
      </Script>
      <SignupPageContent />
    </LocaleProvider>
  );
}
