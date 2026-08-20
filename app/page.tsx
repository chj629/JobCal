import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingDashboardShowcase from "@/components/landing/LandingDashboardShowcase";
import LandingCalendarShowcase from "@/components/landing/LandingCalendarShowcase";
import LandingCompaniesShowcase from "@/components/landing/LandingCompaniesShowcase";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingCtaBanner from "@/components/landing/LandingCtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";
import { ToastProvider } from "@/components/ui/Toast";

// docs/stitch/랜딩페이지/screen.png 기준 공개 Landing 페이지. 인증이 필요한 (app)
// 레이아웃(Sidebar, Companies/Events 등 Provider)을 쓰지 않고 루트 레이아웃(LocaleProvider만
// 포함) 위에 바로 둔다. Hanken Grotesk 폰트/자간/기본 굵기(350)는 이 최상위 wrapper 하나에만
// 적용해 모든 하위 섹션이 상속받게 한다(각 컴포넌트마다 반복하지 않음). ToastProvider는
// LandingPricing의 usePaddleCheckout(useToast 의존)을 위해 추가했다 — (app) 레이아웃
// 밖이라 기존에는 없었다.
export default function LandingPage() {
  return (
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
  );
}
