"use client";

import Link from "next/link";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-20";

// app/refund-policy/page.tsx(ja)와 app/ko/refund-policy/page.tsx(ko)가 공유하는 실제
// 페이지 본문 — 두 라우트 모두 이 컴포넌트를 그대로 렌더링하고, 감싸는
// LocaleProvider(locked)의 initialLocale만 다르다. 본문을 언어별로 복제하지 않는다.
//
// Paddle Live 도메인 심사 대비: Paddle Seller Handbook이 요구하는 "Refund Policy를
// 사이트에 명확히 게시"를 충족하는 전용 페이지. 구체적인 환불 일수/조건은 여기 고정
// 기재하지 않는다 — Paddle의 환불 정책은 판매자(JobCal)가 임의로 바꿀 수 없는
// non-negotiable 정책이라, 숫자를 이 페이지에 못박으면 Paddle이 정책을 바꿀 때마다
// 이 페이지가 낡은 정보가 된다. 대신 "Paddle 정책 + 적용 소비자법을 따른다"는 원칙과
// 공식 링크만 제공한다. /terms §5, /tokushoho의 반품·환불 항목과 동일한 원칙을
// 그대로 재사용하며 내용을 서로 모순되지 않게 맞췄다.
const PADDLE_REFUND_POLICY_URL = "https://www.paddle.com/legal/refund-policy";
const PADDLE_BUYER_TERMS_URL = "https://www.paddle.com/legal/checkout-buyer-terms";

export default function RefundPolicyPageContent() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <LegalPageShell
      title={t("legal.refundPolicy.title")}
      lastUpdated={t("legal.common.lastUpdated", { date: LAST_UPDATED })}
    >
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.refundPolicy.intro")}</p>

      <LegalSection title={t("legal.refundPolicy.providerTitle")}>
        <p>{t("legal.refundPolicy.providerBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refundPolicy.refundTitle")}>
        <p>{t("legal.refundPolicy.refundBody1")}</p>
        <p>{t("legal.refundPolicy.refundBody2")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refundPolicy.cancellationTitle")}>
        <p>{t("legal.refundPolicy.cancellationBody1")}</p>
        <p>{t("legal.refundPolicy.cancellationBody2")}</p>
        <p>{t("legal.refundPolicy.cancellationNote")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refundPolicy.accountDeletionTitle")}>
        <p>{t("legal.refundPolicy.accountDeletionBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refundPolicy.relatedLinksTitle")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a
              href={PADDLE_REFUND_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-900"
            >
              {t("legal.tokushoho.paddleRefundPolicyLinkText")}
            </a>
          </li>
          <li>
            <a
              href={PADDLE_BUYER_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-900"
            >
              {t("legal.tokushoho.paddleBuyerTermsLinkText")}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.refundPolicy.contactTitle")}>
        <p>
          {t("legal.refundPolicy.contactBody")}{" "}
          <Link href={toPublicPageHref(locale, "/contact")} className="underline hover:text-neutral-900">
            {t("legal.refundPolicy.contactLinkText")}
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
