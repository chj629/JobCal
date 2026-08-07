"use client";

import { useT } from "@/lib/locale-context";
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

// 34_landingPage.png 푸터. 기능만 실제 섹션(#features)이 있어 앵커로 연결하고,
// 나머지(요금제/사용법/FAQ/개인정보처리방침/이용약관)는 아직 페이지가 없어 비활성 텍스트로 둔다.
export default function LandingFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <Logo size="sm" />

        <nav className="flex flex-wrap items-center justify-center gap-6">
          <a
            href="#features"
            className="text-xs text-secondary transition-colors duration-150 hover:text-foreground"
          >
            {t("landing.nav.features")}
          </a>
          <span className="text-xs text-secondary/50" aria-disabled="true">
            {t("landing.footer.pricing")}
          </span>
          <span className="text-xs text-secondary/50" aria-disabled="true">
            {t("landing.footer.howItWorks")}
          </span>
          <span className="text-xs text-secondary/50" aria-disabled="true">
            {t("landing.footer.faq")}
          </span>
          <span className="text-xs text-secondary/50" aria-disabled="true">
            {t("landing.footer.privacy")}
          </span>
          <span className="text-xs text-secondary/50" aria-disabled="true">
            {t("landing.footer.terms")}
          </span>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <p className="text-xs text-secondary">{t("landing.footer.copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
