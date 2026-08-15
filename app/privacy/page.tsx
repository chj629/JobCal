"use client";

import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-15";

// docs 조사(Supabase Auth/DB, Google OAuth, OpenAI 메일 분석)를 기준으로 실제 처리하는
// 데이터만 기술한다. 존재하지 않는 기능이나 사업자 정보는 추가하지 않는다.
export default function PrivacyPage() {
  const t = useT();

  return (
    <LegalPageShell
      title={t("legal.privacy.title")}
      lastUpdated={t("legal.common.lastUpdated", { date: LAST_UPDATED })}
    >
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.privacy.intro")}</p>

      <LegalSection title={t("legal.privacy.section1Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section1Account")}</li>
          <li>{t("legal.privacy.section1Service")}</li>
          <li>{t("legal.privacy.section1Ai")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section2Title")}>
        <p>{t("legal.privacy.section2Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section3Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section3Supabase")}</li>
          <li>{t("legal.privacy.section3Google")}</li>
          <li>{t("legal.privacy.section3Openai")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section4Title")}>
        <p>{t("legal.privacy.section4Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section5Title")}>
        <p>{t("legal.privacy.section5Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section6Title")}>
        <p>{t("legal.privacy.section6Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section7Title")}>
        <p>{t("legal.privacy.section7Body")}</p>
      </LegalSection>

      <p className="text-[13px] text-neutral-500">{t("legal.privacy.operator")}</p>
    </LegalPageShell>
  );
}
