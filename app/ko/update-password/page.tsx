import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import UpdatePasswordPageContent from "@/components/auth/UpdatePasswordPageContent";
import { validatePasswordRecoveryGrant } from "@/lib/auth/passwordRecoveryGrant";

export const metadata = buildAuthPageMetadata({
  locale: "ko",
  jaPath: "/update-password",
  titleKey: "auth.updatePassword.title",
  descriptionKey: "auth.updatePassword.description",
});

export default async function KoUpdatePasswordPage() {
  const recovery = await validatePasswordRecoveryGrant();
  return (
    <LocaleProvider initialLocale="ko" locked>
      <UpdatePasswordPageContent recoveryAllowed={recovery.valid} />
    </LocaleProvider>
  );
}
