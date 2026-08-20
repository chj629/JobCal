"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/lib/locale-context";
import { createClient } from "@/lib/supabase/client";
import { usePaddleCheckout } from "@/lib/paddle/usePaddleCheckout";
import { useCurrentPlan } from "@/lib/paddle/useCurrentPlan";
import { ToastProvider } from "@/components/ui/Toast";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import MaterialIcon from "@/components/ui/MaterialIcon";

// Paddle Live Account Verification 심사관이 로그인 없이 확인할 수 있는 공개 Pricing
// 페이지. Free/Pro 공통 기능은 app/api/ai/analyze-email/route.ts의
// FREE_DAILY_ANALYSIS_LIMIT(3) / PRO_DAILY_ANALYSIS_LIMIT(50)가 유일하게 코드로
// 확인되는 차이이며, 그 외 기능은 두 플랜에 동일하게 제공된다. 가격(¥780/월)은
// Settings > Plan 카드(settings.plan.priceLabel)와 동일한 값을 그대로 사용한다.
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

const POLICY_LINKS = [
  { href: "/terms", labelKey: "termsLinkText" },
  { href: "/privacy", labelKey: "privacyLinkText" },
  { href: "/refund-policy", labelKey: "refundPolicyLinkText" },
  { href: "/tokushoho", labelKey: "tokushohoLinkText" },
] as const;

// usePaddleCheckout이 useToast()를 필요로 하는데, /pricing은 (app) 레이아웃 밖이라
// ToastProvider가 없다 — 이 페이지 안에서만 감싸 랜딩/Settings와 동일하게 체크아웃 완료/
// 실패 토스트를 보여줄 수 있게 한다.
export default function PricingPage() {
  return (
    <ToastProvider>
      <PricingPageContent />
    </ToastProvider>
  );
}

function PricingPageContent() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  // /login?next=/pricing&checkout=pro 로 로그인한 뒤 돌아왔는지 여부. 로그인 사용자 정보와
  // Paddle SDK가 모두 준비된 다음, 딱 한 번만 자동으로 Checkout을 연다.
  const [pendingAutoCheckout, setPendingAutoCheckout] = useState(false);
  const autoOpenedRef = useRef(false);

  const { isReady, isCheckoutBusy, openCheckout } = usePaddleCheckout({ userId, email, locale });
  // 이미 Pro인 사용자가 여기서 다시 Checkout을 열어 활성 구독이 2개(이중 청구)가 되는
  // 것을 막기 위해 현재 플랜을 조회한다. Pro 권한 판정(getUserPlan) 자체는 바꾸지 않는다.
  const { plan, refetch: refetchPlan } = useCurrentPlan();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
      setAuthChecked(true);
    });
  }, []);

  // 정적 프리렌더는 쿼리스트링을 모르므로(로그인/가입 페이지와 동일한 이유) 마운트 후에만
  // checkout=pro를 확인한다. 확인 즉시 URL에서 제거해(Next 라우터 네비게이션 없이 주소창만
  // 교체 — 페이지를 재마운트하지 않는다) 새로고침이나 뒤로가기로 다시 이 값이 남아 있어도
  // 두 번째 useEffect가 재실행되지 않게 한다(pendingAutoCheckout은 컴포넌트 state로만 남음).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "pro") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingAutoCheckout(true);
      window.history.replaceState(null, "", "/pricing");
    }
  }, []);

  // 로그인 사용자 정보(userId)와 Paddle SDK(isReady), 현재 플랜(plan)이 모두 준비된
  // 뒤에만, 그리고 autoOpenedRef로 딱 한 번만 Checkout을 연다. authChecked=true인데
  // userId가 없으면(비로그인 상태에서 checkout=pro만 남아 있는 경우) 영원히 열지 않는다.
  // plan === "pro"면(이미 Pro인 사용자가 checkout=pro URL로 돌아온 경우) 자동으로도
  // 절대 열지 않는다 — 이중 구독 방지.
  useEffect(() => {
    if (!pendingAutoCheckout || autoOpenedRef.current) return;
    if (!authChecked || !userId || !isReady || plan === null) return;
    if (plan === "pro") {
      autoOpenedRef.current = true;
      return;
    }

    autoOpenedRef.current = true;
    openCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoCheckout, authChecked, userId, isReady, plan]);

  async function handleProCtaClick() {
    if (!userId) {
      router.push("/login?next=/pricing&checkout=pro");
      return;
    }
    // 클라이언트에 캐시된 plan state만 믿지 않고, Checkout을 열기 직전 한 번 더 최신
    // 값을 확인한다 — 다른 탭에서 방금 결제를 마쳤거나 최초 조회가 아직 끝나지 않은
    // 사이 클릭한 경우에도 이미 Pro라면 Checkout을 열지 않는다.
    const latestPlan = await refetchPlan();
    if (latestPlan === "pro") return;
    openCheckout();
  }

  // 비로그인 상태에서는 클릭이 로그인 페이지 이동일 뿐이라 Paddle 준비 여부와 무관하게
  // 항상 눌릴 수 있어야 한다 — 로그인 상태일 때만 Settings와 동일하게 처리 중/미준비
  // 상태에서 비활성화한다.
  const proDisabled = !!userId && (isCheckoutBusy || !isReady);
  const proBusy = !!userId && isCheckoutBusy;

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <LandingNav />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[32px] leading-[1.2] font-[400] tracking-tight text-neutral-900 sm:text-[40px]">
            {t("pricing.title")}
          </h1>
          <p className="mt-4 text-[15px] leading-[1.7] text-neutral-500 sm:text-[16px]">
            {t("pricing.description")}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="rounded-stitch-2xl border border-neutral-200 bg-white p-8">
            <h2 className="text-[18px] font-[500] tracking-tight text-neutral-900">
              {t("pricing.free.name")}
            </h2>
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
            <h2 className="text-[18px] font-[500] tracking-tight text-neutral-900">
              {t("pricing.pro.name")}
            </h2>
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

            {plan === "pro" ? (
              <>
                <p className="mt-4 text-[13px] font-[500] text-primary-navy">
                  {t("pricing.pro.currentPlanNotice")}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/settings")}
                  className="mt-2 w-full rounded-stitch-2xl border border-neutral-200 bg-white px-6 py-3 text-[14px] font-[400] text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  {t("pricing.pro.manageInSettings")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleProCtaClick}
                disabled={proDisabled}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-stitch-2xl bg-primary-navy px-6 py-3 text-[14px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {proBusy && (
                  <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                )}
                {proBusy ? t("settings.plan.upgrading") : t("pricing.pro.cta")}
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-2xl border-t border-neutral-100 pt-10 text-center">
          <p className="mb-4 text-[13px] font-[500] text-neutral-500">{t("pricing.linksTitle")}</p>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px]">
            {POLICY_LINKS.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className="font-[400] text-neutral-500 underline transition-colors hover:text-neutral-900"
              >
                {t(`pricing.${labelKey}`)}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
