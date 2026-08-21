import type { Metadata } from "next";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingDashboardShowcase from "@/components/landing/LandingDashboardShowcase";
import LandingCalendarShowcase from "@/components/landing/LandingCalendarShowcase";
import LandingCompaniesShowcase from "@/components/landing/LandingCompaniesShowcase";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingCtaBanner from "@/components/landing/LandingCtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { LocaleProvider } from "@/lib/locale-context";

// app/page.tsx(일본어 랜딩)와 완전히 같은 컴포넌트 나열을 그대로 재사용한다 — 복제된
// 랜딩 컴포넌트는 없다. title/description은 messages/ko.json에 이미 있는 번역
// (landing.hero.subline)을 그대로 가져온 것이며, 이 파일을 위해 새로 지어낸 카피가
// 아니다. OG 이미지는 app/opengraph-image.tsx(일본어 카피 고정)를 그대로 상속한다 —
// 한국어 전용 OG 이미지는 이번 범위에 포함하지 않는다(다음 단계에서 별도 처리).
const SITE_TITLE = "JobCal";
const SITE_DESCRIPTION_KO = "메일을 붙여넣기만 하면, 기업・전형・일정을 JobCal AI가 정리합니다.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION_KO,
  alternates: {
    canonical: "/ko",
    languages: {
      ja: "https://jobcal.app/",
      ko: "https://jobcal.app/ko",
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_KO,
    url: "/ko",
    siteName: SITE_TITLE,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_KO,
  },
};

// /(일본어 랜딩, app/page.tsx)와 이 페이지가 유일하게 다른 부분은 안쪽
// LocaleProvider의 initialLocale뿐이다 — 나머지 JSX 나열과 스타일은 그대로 복사해
// 재사용한다(공유 컴포넌트 자체를 복제하지 않음). locked를 켜 로그인 사용자의
// user_metadata.language나 localStorage에 남은 다른 언어가 있어도 SSR 첫 렌더인
// 한국어가 마운트 후 다시 바뀌지 않게 한다.
export default function KoLandingPage() {
  return (
    <LocaleProvider initialLocale="ko" locked>
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
