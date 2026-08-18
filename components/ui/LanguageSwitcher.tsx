"use client";

import { Globe } from "lucide-react";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

export interface LanguageSwitcherProps {
  className?: string;
  // 61차: 랜딩 Header의 모바일(390px) 반응형 대응 전용 opt-in. 기본값 false라
  // 이 prop을 넘기지 않는 기존 호출부(로그인/회원가입 등 인증 페이지, Settings)는
  // 전혀 영향받지 않는다 — 지금과 완전히 같은 마크업이 그대로 렌더링된다.
  // compact=true일 때만 아래에서 "sm 미만에서는 축약형(KO/JA, 지구본 아이콘 없음),
  // sm 이상에서는 기존과 동일한 전체 라벨"로 CSS만으로 반응형 전환한다(JS
  // 미디어쿼리/hydration 분기 없음 — 두 버전을 함께 렌더링하고 hidden/flex로
  // 보이는 쪽만 바꾼다).
  compact?: boolean;
}

const OPTIONS: Array<{ value: Locale; labelKey: string }> = [
  { value: "ko", labelKey: "settings.korean" },
  { value: "ja", labelKey: "settings.japanese" },
];
const COMPACT_LABELS: Record<Locale, string> = { ko: "KO", ja: "JA" };

// 로그인 여부와 무관하게 항상 렌더링 가능하다. useLocale()의 setLocale은
// lib/locale-context.tsx가 로그인 상태에 따라 localStorage/Supabase 저장을 알아서
// 분기하므로 이 컴포넌트는 Settings 탭(app/(app)/settings/page.tsx)과 동일하게
// setLocale만 호출하면 된다.
export default function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  if (!compact) {
    return (
      <div
        className={
          "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs " +
          className
        }
      >
        <Globe size={14} className="ml-1.5 shrink-0 text-secondary" aria-hidden="true" />
        {OPTIONS.map((option) => {
          const isActive = locale === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocale(option.value)}
              aria-pressed={isActive}
              className={
                "rounded-full px-2.5 py-1 font-medium transition-colors duration-150 " +
                (isActive ? "bg-primary text-white" : "text-secondary hover:text-foreground")
              }
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div
        className={
          "hidden items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs sm:inline-flex " +
          className
        }
      >
        <Globe size={14} className="ml-1.5 shrink-0 text-secondary" aria-hidden="true" />
        {OPTIONS.map((option) => {
          const isActive = locale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocale(option.value)}
              aria-pressed={isActive}
              className={
                "rounded-full px-2.5 py-1 font-medium transition-colors duration-150 " +
                (isActive ? "bg-primary text-white" : "text-secondary hover:text-foreground")
              }
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
      <div
        className={
          "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-[11px] sm:hidden " +
          className
        }
      >
        {OPTIONS.map((option) => {
          const isActive = locale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocale(option.value)}
              aria-pressed={isActive}
              aria-label={t(option.labelKey)}
              className={
                "rounded-full px-2 py-1 font-medium transition-colors duration-150 " +
                (isActive ? "bg-primary text-white" : "text-secondary hover:text-foreground")
              }
            >
              {COMPACT_LABELS[option.value]}
            </button>
          );
        })}
      </div>
    </>
  );
}
