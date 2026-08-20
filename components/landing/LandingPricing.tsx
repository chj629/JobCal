"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/locale-context";
import { createClient } from "@/lib/supabase/client";
import { usePaddleCheckout } from "@/lib/paddle/usePaddleCheckout";
import MaterialIcon from "@/components/ui/MaterialIcon";

// app/pricing/page.tsx와 동일한 Free/Pro 정보(pricing.* i18n 키)를 그대로 재사용한다 —
// 문구를 따로 만들지 않는다. Pro CTA는 로그인 상태면 바로 Paddle Checkout을 열고,
// 비로그인 상태면 /login?next=/pricing&checkout=pro 로 보내 로그인 후 /pricing에서
// Checkout이 자동으로 재개되게 한다(비로그인 상태에서 이 페이지가 직접 Checkout을
// 여는 경로는 없다).
const SHARED_FEATURE_KEYS = [
  "companyManagement",
  "companySearch",
  "selectionSteps",
  "schedule",
  "dashboard",
  "calendar",
  "analytics",
  "mypage",
  "contactsAndMemo",
  "responsive",
] as const;

export default function LandingPricing() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const { isReady, isCheckoutBusy, openCheckout } = usePaddleCheckout({ userId, email, locale });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
    });
  }, []);

  function handleProCtaClick() {
    if (userId) {
      openCheckout();
      return;
    }
    router.push("/login?next=/pricing&checkout=pro");
  }

  // 비로그인 상태에서는 클릭이 로그인 페이지 이동일 뿐이라 Paddle 준비 여부와 무관하게
  // 항상 눌릴 수 있어야 한다 — 로그인 상태일 때만 Settings와 동일하게 처리 중/미준비
  // 상태에서 비활성화한다.
  const proDisabled = !!userId && (isCheckoutBusy || !isReady);
  const proBusy = !!userId && isCheckoutBusy;

  return (
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-24 text-center md:px-12 md:py-32">
      <h2 className="text-[27px] leading-[1.2] font-[500] tracking-tight text-neutral-900 sm:text-[36px]">
        {t("pricing.title")}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-[1.7] text-neutral-500 sm:text-[16px]">
        {t("pricing.description")}
      </p>

      <div className="mx-auto mt-14 grid max-w-3xl gap-6 text-left sm:grid-cols-2">
        <div className="rounded-stitch-2xl border border-neutral-200 bg-white p-8">
          <h3 className="text-[18px] font-[500] tracking-tight text-neutral-900">
            {t("pricing.free.name")}
          </h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-[36px] font-[500] tracking-tight text-neutral-900">
              {t("pricing.free.price")}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">{t("pricing.free.priceNote")}</p>

          <ul className="mt-6 space-y-2.5 text-[14px] leading-[1.6] text-neutral-600">
            {SHARED_FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <MaterialIcon name="check" size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                <span>{t(`pricing.features.${key}`)}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" size={16} className="mt-0.5 shrink-0 text-neutral-400" />
              <span>{t("pricing.free.aiLimit")}</span>
            </li>
          </ul>

          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="mt-8 w-full rounded-stitch-2xl border border-neutral-200 bg-white px-6 py-3 text-[14px] font-[400] text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            {t("pricing.free.cta")}
          </button>
        </div>

        <div className="rounded-stitch-2xl border border-primary-navy bg-white p-8 shadow-[0_2px_10px_rgba(30,58,138,0.1)]">
          <h3 className="text-[18px] font-[500] tracking-tight text-neutral-900">
            {t("pricing.pro.name")}
          </h3>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-[36px] font-[500] tracking-tight text-neutral-900">
              {t("pricing.pro.price")}
            </span>
            <span className="text-[14px] text-neutral-500">{t("pricing.pro.priceUnit")}</span>
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">{t("pricing.pro.priceNote")}</p>

          <ul className="mt-6 space-y-2.5 text-[14px] leading-[1.6] text-neutral-600">
            {SHARED_FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <MaterialIcon name="check" size={16} className="mt-0.5 shrink-0 text-primary-navy" />
                <span>{t(`pricing.features.${key}`)}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" size={16} className="mt-0.5 shrink-0 text-primary-navy" />
              <span>{t("pricing.pro.aiLimit")}</span>
            </li>
          </ul>

          <p className="mt-6 text-[12px] text-neutral-400">{t("pricing.pro.notice")}</p>

          <button
            type="button"
            onClick={handleProCtaClick}
            disabled={proDisabled}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-stitch-2xl bg-primary-navy px-6 py-3 text-[14px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {proBusy && <MaterialIcon name="progress_activity" size={14} className="animate-spin" />}
            {proBusy ? t("settings.plan.upgrading") : t("pricing.pro.cta")}
          </button>
        </div>
      </div>
    </section>
  );
}
