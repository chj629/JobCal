"use client";

import Link from "next/link";
import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-20";

// Paddle 유료 구독(Pro) 도입에 맞춰 기존 "무료 MVP" 전제 문구를 제거하고, Free/Pro
// 플랜 구조 + 유료 플랜/결제(4) + 해지·환불(5) 섹션을 새로 추가했다(총 13 -> 15개
// 섹션, 기존 4번 이후 섹션 번호가 전부 2씩 밀림). Paddle이 Merchant of Record라는
// 문구(4-3)는 Paddle Seller Handbook이 요구하는 정형 문구를 그대로 옮긴 것이며,
// 환불 조건(5-3)은 Paddle의 환불 정책(판매자가 임의로 바꿀 수 없음)과 소비자
// 보호법령을 따른다고만 밝히고 구체적 일수는 이 페이지에 고정하지 않는다.
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
          <li>{t("legal.terms.section5Body4")}</li>
          <li>
            {t("legal.terms.section5Body5Prefix")}{" "}
            <Link href="/refund-policy" className="underline hover:text-neutral-900">
              {t("legal.terms.section5Body5LinkText")}
            </Link>
            {t("legal.terms.section5Body5Suffix")}
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section6Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section6Body1")}</li>
          <li>{t("legal.terms.section6Body2")}</li>
          <li>{t("legal.terms.section6Body3")}</li>
          <li>{t("legal.terms.section6Body4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section7Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section7Body1")}</li>
          <li>{t("legal.terms.section7Body2")}</li>
          <li>{t("legal.terms.section7Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section8Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section8Item1")}</li>
          <li>{t("legal.terms.section8Item2")}</li>
          <li>{t("legal.terms.section8Item3")}</li>
          <li>{t("legal.terms.section8Item4")}</li>
          <li>{t("legal.terms.section8Item5")}</li>
          <li>{t("legal.terms.section8Item6")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section9Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section9Body1")}</li>
          <li>{t("legal.terms.section9Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section10Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section10Body1")}</li>
          <li>{t("legal.terms.section10Body2")}</li>
          <li>{t("legal.terms.section10Body3")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section11Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section11Body1")}</li>
          <li>{t("legal.terms.section11Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section12Title")}>
        <p>{t("legal.terms.section12Intro")}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section12Body1")}</li>
          <li>{t("legal.terms.section12Body2")}</li>
          <li>{t("legal.terms.section12Body3")}</li>
          <li>{t("legal.terms.section12Body4")}</li>
        </ul>
        <p>{t("legal.terms.section12Note")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section13Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section13Body1")}</li>
          <li>{t("legal.terms.section13Body2")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.terms.section14Title")}>
        <p>{t("legal.terms.section14Body")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.section15Title")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{t("legal.terms.section15Body1")}</li>
          <li>{t("legal.terms.section15Body2")}</li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
