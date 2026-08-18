"use client";

import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-18";

// docs 조사(Supabase Auth/DB, Google OAuth, OpenAI 메일 분석)를 기준으로 실제 처리하는
// 데이터만 기술한다. 존재하지 않는 기능이나 사업자 정보는 추가하지 않는다.
// 9개 섹션 구조(취득 정보/이용 목적/AI 메일 분석/외부 서비스/보관·삭제/쿠키/안전관리조치/
// 이용자 권리/문의·운영자)는 실제 코드 조사 결과를 그대로 반영한 것이며, 문의 접수 기능이
// 아직 없다는 점과 운영자 정보가 미확정이라는 점을 9번 섹션에서 사실대로 안내한다.
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
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section2Title")}>
        <p>{t("legal.privacy.section2Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section3Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section3Body1")}</li>
          <li>{t("legal.privacy.section3Body2")}</li>
          <li>{t("legal.privacy.section3Body3")}</li>
          <li>{t("legal.privacy.section3Body4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section4Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section4Supabase")}</li>
          <li>{t("legal.privacy.section4Openai")}</li>
          <li>{t("legal.privacy.section4Google")}</li>
          <li>{t("legal.privacy.section4Vercel")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section5Title")}>
        <p>{t("legal.privacy.section5Body1")}</p>
        <p>{t("legal.privacy.section5Body2")}</p>
        <p>{t("legal.privacy.section5Body3")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section6Title")}>
        <p>{t("legal.privacy.section6Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section7Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section7Body1")}</li>
          <li>{t("legal.privacy.section7Body2")}</li>
          <li>{t("legal.privacy.section7Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section8Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.privacy.section8Body1")}</li>
          <li>{t("legal.privacy.section8Body2")}</li>
          <li>{t("legal.privacy.section8Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacy.section9Title")}>
        <p>{t("legal.privacy.section9Body")}</p>
      </LegalSection>
    </LegalPageShell>
  );
}
