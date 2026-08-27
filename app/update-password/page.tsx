import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import UpdatePasswordPageContent from "@/components/auth/UpdatePasswordPageContent";
import { validatePasswordRecoveryGrant } from "@/lib/auth/passwordRecoveryGrant";

export const metadata = buildAuthPageMetadata({
  locale: "ja",
  jaPath: "/update-password",
  titleKey: "auth.updatePassword.title",
  descriptionKey: "auth.updatePassword.description",
});

export default async function UpdatePasswordPage() {
  const recovery = await validatePasswordRecoveryGrant();
  return (
    <LocaleProvider initialLocale="ja" locked>
      <UpdatePasswordPageContent recoveryAllowed={recovery.valid} />
    </LocaleProvider>
  );
}
