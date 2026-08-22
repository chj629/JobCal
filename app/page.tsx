import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingDashboardShowcase from "@/components/landing/LandingDashboardShowcase";
import LandingCalendarShowcase from "@/components/landing/LandingCalendarShowcase";
import LandingCompaniesShowcase from "@/components/landing/LandingCompaniesShowcase";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingCtaBanner from "@/components/landing/LandingCtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/Toast";
import { LocaleProvider } from "@/lib/locale-context";
import { buildBrowserLocaleRedirectScript } from "@/lib/i18n/browserLocaleRedirectScript";

// docs/stitch/랜딩페이지/screen.png 기준 공개 Landing 페이지. 인증이 필요한 (app)
// 레이아웃(Sidebar, Companies/Events 등 Provider)을 쓰지 않고 루트 레이아웃(LocaleProvider만
// 포함) 위에 바로 둔다. Hanken Grotesk 폰트/자간/기본 굵기(350)는 이 최상위 wrapper 하나에만
// 적용해 모든 하위 섹션이 상속받게 한다(각 컴포넌트마다 반복하지 않음). ToastProvider는
// LandingPricing의 usePaddleCheckout(useToast 의존)을 위해 추가했다 — (app) 레이아웃
// 밖이라 기존에는 없었다.
//
// /ko(app/ko/page.tsx)와 완전히 같은 컴포넌트 나열을 공유한다 — 복제하지 않고, 이
// 안쪽 LocaleProvider(locked, initialLocale="ja")만 다르게 감싸 언어를 고정한다.
// 이 안쪽 Provider가 root layout(app/layout.tsx)의 바깥쪽 LocaleProvider보다 항상
// 우선하므로(React Context는 가장 안쪽 값을 따름), 로그인 사용자의 user_metadata.language나
// localStorage에 저장된 다른 언어가 있어도 마운트 후 다시 바뀌지 않는다("locked").
export default function LandingPage() {
  return (
    <LocaleProvider initialLocale="ja" locked>
      <Script id="browser-locale-redirect" strategy="beforeInteractive">
        {buildBrowserLocaleRedirectScript("/ko")}
      </Script>
      <ToastProvider>
        <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
          <LandingNav />
          <LandingHero />
          <LandingDashboardShowcase />
          <LandingCalendarShowcase />
          <LandingCompaniesShowcase />
          <LandingPricing />
          <LandingCtaBanner />
          <LandingFooter />
        </div>
      </ToastProvider>
    </LocaleProvider>
  );
}
