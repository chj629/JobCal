"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

// 34_landingPage.png 상단 네비게이션. 요금제/사용법/자주 묻는 질문은 이번 Step에서
// 페이지를 만들지 않으므로 비활성 텍스트로 표시하고, 기능만 하단 기능 소개 섹션(#features)으로
// 스크롤하는 앵커로 연결한다.
export default function LandingNav() {
  const t = useT();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Logo size="md" />

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-secondary transition-colors duration-150 hover:text-foreground"
          >
            {t("landing.nav.features")}
          </a>
          <span className="text-sm font-medium text-secondary/50" aria-disabled="true">
            {t("landing.nav.pricing")}
          </span>
          <span className="text-sm font-medium text-secondary/50" aria-disabled="true">
            {t("landing.nav.howItWorks")}
          </span>
          <span className="text-sm font-medium text-secondary/50" aria-disabled="true">
            {t("landing.nav.faq")}
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Button variant="secondary" onClick={() => router.push("/login")}>
            {t("landing.nav.login")}
          </Button>
          <Button variant="primary" onClick={() => router.push("/signup")}>
            {t("landing.nav.getStarted")}
          </Button>
        </div>
      </div>
    </header>
  );
}
