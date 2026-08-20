"use client";

import Link from "next/link";
import { useT } from "@/lib/locale-context";
import LegalPageShell, { LegalSection } from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "2026-08-20";

// Paddle 공식 정책 페이지. 페이지 내에서 구체적인 반환/환불 일수 등을 직접 적지 않고
// 이 링크로 연결하는 이유는, Paddle의 환불 정책이 판매자(JobCal)가 임의로 바꿀 수 없는
// 정책(non-negotiable)이라 Paddle이 정책을 바꾸면 이 페이지의 고정 텍스트가 바로 낡은
// 정보가 되기 때문이다.
const PADDLE_REFUND_POLICY_URL = "https://www.paddle.com/legal/refund-policy";
const PADDLE_BUYER_TERMS_URL = "https://www.paddle.com/legal/checkout-buyer-terms";

// 特定商取引法 제11조가 요구하는 표시 항목. 판매업자 성명/소재지/전화번호는 동법이
// 허용하는 "청구가 있으면 지체없이 개시" 방식을 채택해 실제 값을 이 페이지에 직접
// 기재하지 않는다(개인 운영자의 개인정보 보호 목적) — 대신 /contact로 요청을 받는다.
// 실제 성명/주소/전화번호를 이 파일에 하드코딩하지 않는다.
const DISCLOSURE_ITEM_KEYS = [
  "serviceName",
  "operatorName",
  "address",
  "phone",
  "price",
  "additionalFee",
  "paymentMethod",
  "paymentTiming",
  "serviceProvision",
  "contractPeriod",
  "cancellation",
  "accountDeletion",
  "refund",
  "environment",
  "contact",
] as const;

export default function TokushohoPage() {
  const t = useT();

  return (
    <LegalPageShell
      title={t("legal.tokushoho.title")}
      lastUpdated={t("legal.common.lastUpdated", { date: LAST_UPDATED })}
    >
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.tokushoho.intro")}</p>

      <LegalSection title={t("legal.tokushoho.itemsTitle")}>
        <dl className="divide-y divide-neutral-100">
          {DISCLOSURE_ITEM_KEYS.map((key) => (
            <div key={key} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[220px_1fr] sm:gap-6">
              <dt className="text-[13px] font-medium text-neutral-900">
                {t(`legal.tokushoho.${key}Label`)}
              </dt>
              <dd className="text-[14px] leading-[1.7] text-neutral-600">
                {t(`legal.tokushoho.${key}Value`)}
                {key === "refund" && (
                  <>
                    {" "}
                    <Link href="/refund-policy" className="underline hover:text-neutral-900">
                      {t("legal.tokushoho.refundPolicyPageLinkText")}
                    </Link>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="pt-2 text-[13px] leading-[1.7] text-neutral-500">
          {t("legal.tokushoho.serviceNameNote")}
        </p>
        <p className="text-[13px] leading-[1.7] text-neutral-500">
          {t("legal.tokushoho.disclosureNote")}
        </p>
      </LegalSection>

      <LegalSection title={t("legal.tokushoho.relatedLinksTitle")}>
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
    </LegalPageShell>
  );
}
