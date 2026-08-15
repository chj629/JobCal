"use client";

import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";
import { CONTACT_EMAIL } from "@/lib/config";

export default function ContactPage() {
  const t = useT();

  return (
    <LegalPageShell title={t("legal.contact.title")}>
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.contact.description")}</p>

      <LegalSection title={t("legal.contact.emailLabel")}>
        {CONTACT_EMAIL ? (
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-navy hover:underline">
            {CONTACT_EMAIL}
          </a>
        ) : (
          <p className="text-neutral-500">{t("legal.contact.pending")}</p>
        )}
      </LegalSection>
    </LegalPageShell>
  );
}
