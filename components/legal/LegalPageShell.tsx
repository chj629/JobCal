"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/ui/SiteHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePublicHomeHref, usePublicPageLanguageHrefs } from "@/lib/i18n/publicLocalePaths";

interface LegalPageShellProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

// /privacy, /terms, /contact 등 6개 공개 문서형 페이지(그리고 각각의 /ko/* 짝)가 공유하는
// 레이아웃. 랜딩 페이지와 같은 SiteHeader/LandingFooter를 그대로 재사용해 헤더·푸터가
// 자연스럽게 통일되도록 한다. 언어 전환 대상 URL(/privacy ↔ /ko/privacy 등)과 로고 홈
// 링크는 현재 URL/locale로부터 자동 계산되므로, 페이지마다 별도로 넘겨줄 필요가 없다.
export default function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  const languageHrefs = usePublicPageLanguageHrefs();
  const homeHref = usePublicHomeHref();

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <SiteHeader languageHrefs={languageHrefs} homeHref={homeHref} />
      <main className="mx-auto max-w-[760px] px-6 pb-24 pt-32 md:px-12">
        <h1 className="mb-2 text-[32px] leading-[1.2] font-[400] tracking-tight text-neutral-900">
          {title}
        </h1>
        {lastUpdated && <p className="mb-10 text-[13px] text-neutral-500">{lastUpdated}</p>}
        <div className="space-y-10">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-[500] tracking-tight text-neutral-900">{title}</h2>
      <div className="space-y-3 text-[14px] leading-[1.7] text-neutral-600">{children}</div>
    </section>
  );
}
