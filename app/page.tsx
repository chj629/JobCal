import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingAiHighlight from "@/components/landing/LandingAiHighlight";
import LandingShowcase from "@/components/landing/LandingShowcase";
import LandingCtaBanner from "@/components/landing/LandingCtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";

// docs/stitch/랜딩페이지/screen.png 기준 공개 Landing 페이지. 인증이 필요한 (app)
// 레이아웃(Sidebar, Companies/Events 등 Provider)을 쓰지 않고 루트 레이아웃(LocaleProvider만
// 포함) 위에 바로 둔다. Hanken Grotesk 폰트/자간/기본 굵기(350)는 이 최상위 wrapper 하나에만
// 적용해 모든 하위 섹션이 상속받게 한다(각 컴포넌트마다 반복하지 않음).
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingAiHighlight />
      <LandingShowcase />
      <LandingCtaBanner />
      <LandingFooter />
    </div>
  );
}
