import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import UpdatePasswordPageContent from "@/components/auth/UpdatePasswordPageContent";

export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/update-password",
  titleKey: "auth.updatePassword.title",
  descriptionKey: "auth.updatePassword.description",
});

export default function KoUpdatePasswordPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
      <UpdatePasswordPageContent />
    </LocaleProvider>
  );
}
