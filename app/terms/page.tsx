"use client";

import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-18";

// docs 조사(Supabase Auth/DB, Google OAuth, OpenAI 메일 분석, 계정삭제 cascade 등)를
// 기준으로 실제 구현된 기능만 기술한다. 결제/구독, 실제 작동하는 문의 채널, 확정된
// 운영자 정보 등 코드에 없는 내용은 추가하지 않고 13번 섹션에서 TODO로 명시한다.
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
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section2Body1")}</li>
          <li>{t("legal.terms.section2Body2")}</li>
          <li>{t("legal.terms.section2Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section3Title")}>
        <p>{t("legal.terms.section3Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section4Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section4Body1")}</li>
          <li>{t("legal.terms.section4Body2")}</li>
          <li>{t("legal.terms.section4Body3")}</li>
          <li>{t("legal.terms.section4Body4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section5Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section5Body1")}</li>
          <li>{t("legal.terms.section5Body2")}</li>
          <li>{t("legal.terms.section5Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section6Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section6Item1")}</li>
          <li>{t("legal.terms.section6Item2")}</li>
          <li>{t("legal.terms.section6Item3")}</li>
          <li>{t("legal.terms.section6Item4")}</li>
          <li>{t("legal.terms.section6Item5")}</li>
          <li>{t("legal.terms.section6Item6")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section7Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section7Body1")}</li>
          <li>{t("legal.terms.section7Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section8Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section8Body1")}</li>
          <li>{t("legal.terms.section8Body2")}</li>
          <li>{t("legal.terms.section8Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section9Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section9Body1")}</li>
          <li>{t("legal.terms.section9Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section10Title")}>
        <p>{t("legal.terms.section10Intro")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section10Body1")}</li>
          <li>{t("legal.terms.section10Body2")}</li>
          <li>{t("legal.terms.section10Body3")}</li>
          <li>{t("legal.terms.section10Body4")}</li>
        </ul>
        <p>{t("legal.terms.section10Note")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section11Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section11Body1")}</li>
          <li>{t("legal.terms.section11Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section12Title")}>
        <p>{t("legal.terms.section12Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section13Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section13Body1")}</li>
          <li>{t("legal.terms.section13Body2")}</li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
