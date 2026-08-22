import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import { buildBrowserLocaleRedirectScript } from "@/lib/i18n/browserLocaleRedirectScript";
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
      <Script id="browser-locale-redirect" strategy="beforeInteractive">
        {buildBrowserLocaleRedirectScript("/ko/login")}
      </Script>
      <LoginPageContent />
    </LocaleProvider>
  );
}
