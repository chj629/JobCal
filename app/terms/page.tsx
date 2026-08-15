"use client";

import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-15";

export default function TermsPage() {
  const t = useT();

  return (
    <LegalPageShell
      title={t("legal.terms.title")}
      lastUpdated={t("legal.common.lastUpdated", { date: LAST_UPDATED })}
    >
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.terms.intro")}</p>

      <LegalSection title={t("legal.terms.section1Title")}>
        <p>{t("legal.terms.section1Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section2Title")}>
        <p>{t("legal.terms.section2Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section3Title")}>
        <p>{t("legal.terms.section3Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section4Title")}>
        <p>{t("legal.terms.section4Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section5Title")}>
        <p>{t("legal.terms.section5Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section6Title")}>
        <p>{t("legal.terms.section6Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section7Title")}>
        <p>{t("legal.terms.section7Body")}</p>
      </LegalSection>

      <p className="text-[13px] text-neutral-500">{t("legal.terms.operator")}</p>
    </LegalPageShell>
  );
}
