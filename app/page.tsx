import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingCtaBanner from "@/components/landing/LandingCtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";

// 34_landingPage.png 기준 공개 Landing 페이지. 인증이 필요한 (app) 레이아웃(Sidebar,
// Companies/Events 등 Provider)을 쓰지 않고 루트 레이아웃(LocaleProvider만 포함) 위에 바로 둔다.
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingCtaBanner />
      <LandingFooter />
    </div>
  );
}
