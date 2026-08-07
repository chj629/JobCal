"use client";

import { Globe } from "lucide-react";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

export interface LanguageSwitcherProps {
  className?: string;
}

const OPTIONS: Array<{ value: Locale; labelKey: string }> = [
  { value: "ko", labelKey: "settings.korean" },
  { value: "ja", labelKey: "settings.japanese" },
];

// 로그인 여부와 무관하게 항상 렌더링 가능하다. useLocale()의 setLocale은
// lib/locale-context.tsx가 로그인 상태에 따라 localStorage/Supabase 저장을 알아서
// 분기하므로 이 컴포넌트는 Settings 탭(app/(app)/settings/page.tsx)과 동일하게
// setLocale만 호출하면 된다.
export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const t = useT();

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
