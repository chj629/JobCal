"use client";

import Link from "next/link";
import { useT } from "@/lib/locale-context";

// docs/stitch/랜딩페이지/screen.png 푸터. 시안은 로고+Privacy/Terms/Contact 3개 링크+저작권
// 뿐이라 기존의 요금제/사용법/FAQ 비활성 링크는 제거한다(해당 페이지가 없어 시안에도 없음).
// 언어 전환은 상단 헤더(LandingNav)에 이미 있어 여기서는 중복으로 두지 않는다.
export default function LandingFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between md:px-12">
        <span className="text-[18px] font-[400] tracking-tight text-neutral-900">
          {t("common.appName")}
        </span>

        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px]">
          <Link
            href="/pricing"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.pricing")}
          </Link>
          <Link
            href="/privacy"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.privacy")}
          </Link>
          <Link
            href="/terms"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.terms")}
          </Link>
          <Link
            href="/refund-policy"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.refundPolicy")}
          </Link>
          <Link
            href="/tokushoho"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.tokushoho")}
          </Link>
          <Link
            href="/contact"
            className="font-[400] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {t("landing.footer.contact")}
          </Link>
        </nav>

        <p className="text-[13px] text-neutral-400">{t("landing.footer.copyright", { year })}</p>
      </div>
    </footer>
  );
}
