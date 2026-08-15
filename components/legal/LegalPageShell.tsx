"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/ui/SiteHeader";
import LandingFooter from "@/components/landing/LandingFooter";

interface LegalPageShellProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

// /privacy, /terms, /contact가 공유하는 문서형 페이지 레이아웃. 랜딩 페이지와 같은
// SiteHeader/LandingFooter를 그대로 재사용해 헤더·푸터가 자연스럽게 통일되도록 한다.
export default function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <SiteHeader />
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
