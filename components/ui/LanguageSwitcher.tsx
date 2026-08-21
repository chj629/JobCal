"use client";

import Link from "next/link";
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
  // 마케팅 랜딩(/, /ko) 전용. 넘기면 버튼이 setLocale(state 변경)이 아니라 이 맵이
  // 가리키는 URL로 이동하는 <Link>가 된다 — 랜딩은 로그인 여부와 무관하게 URL 자체가
  // 언어이므로, 클릭 시 다른 언어의 실제 페이지(/  또는 /ko)로 이동해야 한다. 로그인/
  // 가입/설정 등 기존 호출부는 이 prop을 넘기지 않으므로 지금까지와 동일하게 동작한다.
  hrefs?: Record<Locale, string>;
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
export default function LanguageSwitcher({ className = "", compact = false, hrefs }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  // hrefs가 있으면 <Link href>로, 없으면 기존 <button onClick={setLocale}>로 렌더링한다.
  // 셋(non-compact / compact sm-visible / compact sm-hidden)이 공유하는 클래스/aria만
  // 이 함수로 뽑아 중복을 줄인다 — 동작 자체(hrefs 유무에 따른 분기)는 그대로다.
  function renderOption(
    option: (typeof OPTIONS)[number],
    label: string,
    ariaLabel: string | undefined,
    optionClassName: string
  ) {
    const isActive = locale === option.value;
    const fullClassName =
      optionClassName + " font-medium transition-colors duration-150 " +
      (isActive ? "bg-primary text-white" : "text-secondary hover:text-foreground");

    if (hrefs) {
      return (
        <Link
          key={option.value}
          href={hrefs[option.value]}
          aria-label={ariaLabel}
          aria-current={isActive ? "page" : undefined}
          className={fullClassName}
        >
          {label}
        </Link>
      );
    }

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => setLocale(option.value)}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        className={fullClassName}
      >
        {label}
      </button>
    );
  }

  if (!compact) {
    return (
      <div
        className={
          "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs " +
          className
        }
      >
        <Globe size={14} className="ml-1.5 shrink-0 text-secondary" aria-hidden="true" />
        {OPTIONS.map((option) => renderOption(option, t(option.labelKey), undefined, "rounded-full px-2.5 py-1"))}
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
        {OPTIONS.map((option) => renderOption(option, t(option.labelKey), undefined, "rounded-full px-2.5 py-1"))}
      </div>
      <div
        className={
          "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-[11px] sm:hidden " +
          className
        }
      >
        {OPTIONS.map((option) =>
          renderOption(option, COMPACT_LABELS[option.value], t(option.labelKey), "rounded-full px-2 py-1")
        )}
      </div>
    </>
  );
}
