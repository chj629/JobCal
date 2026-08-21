"use client";

import { useEffect, useState, type RefObject } from "react";
import { useT } from "@/lib/locale-context";

export interface AiOnboardingHintProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onStart: () => void;
  onDismiss: () => void;
}

const POPOVER_WIDTH = 288;
const POPOVER_GAP = 12;
const ARROW_SIZE = 12;

// JobCal의 핵심 기능인 Header의 "AIで追加" 하나만 짚어주는 1-step onboarding hint.
// 여러 단계짜리 일반 튜토리얼 엔진을 만들지 않고 이 화면 전용으로 최소 구현한다.
// 화면 전체 dim + AI 버튼만 뚫린 "spotlight"는 별도 backdrop 엘리먼트 없이, 버튼
// 위치에 정확히 맞춘 투명 div 하나에 box-shadow `0 0 0 9999px rgba(...)`를 걸어
// 구현한다 — spread가 화면을 가득 채워 그 바깥 전체를 어둡게 채우고, div 자기
// 자신의 영역(=AI 버튼 자리)만 완전히 투명해 버튼이 원래 상태 그대로 비쳐 보인다.
// pointer-events-none이라 배경 클릭도 막지 않는다 — 화면을 지배하는 모달이 아니라
// 작은 product hint이므로 인터랙션을 강제로 가두지 않는다.
// Step 1 → Step 2 전환이 "다른 화면으로 넘어감"처럼 보이지 않도록, CTA/dismiss를 누른 순간
// 컴포넌트를 즉시 통째로 제거하지 않는다 — Drawer.tsx의 mounted/visible(+render 중 open
// 변화 감지) 패턴을 그대로 따라 opacity로 짧게 fade-out한 뒤에만 실제로 unmount한다.
const EXIT_FADE_MS = 180;

export default function AiOnboardingHint({ open, anchorRef, onStart, onDismiss }: AiOnboardingHintProps) {
  const t = useT();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Drawer.tsx와 동일한 이유: open prop 변화를 effect가 아니라 렌더 중에 감지해 즉시
  // 반영한다 — 열릴 때는 mounted를, 닫힐 때는 visible을 먼저 내려 fade-out을 시작한다.
  // (useEffect 본문에서 setState를 동기 호출하면 react-hooks/set-state-in-effect가
  // cascading render 위험을 경고하므로, Drawer.tsx처럼 렌더 중 분기로 처리한다.)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
    } else {
      setVisible(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    function measure() {
      const el = anchorRef.current;
      if (el) setRect(el.getBoundingClientRect());
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, anchorRef]);

  // mounted 직후 다음 프레임에 visible을 올려 opacity-0 → opacity-100 전환이 실제로
  // 재생되게 하고(Drawer.tsx와 동일한 이유), open이 false면(visible은 이미 위 렌더 중
  // 분기에서 내려간 상태) 전환이 끝날 시점에 실제로 unmount한다.
  useEffect(() => {
    if (!mounted) return;

    if (!open) {
      const timeout = setTimeout(() => setMounted(false), EXIT_FADE_MS);
      return () => clearTimeout(timeout);
    }

    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  if (!mounted || !rect) return null;

  const popoverLeft = Math.max(12, rect.right - POPOVER_WIDTH);
  const arrowLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - popoverLeft - ARROW_SIZE / 2, 16),
    POPOVER_WIDTH - ARROW_SIZE - 16
  );
  const fadeClass = "transition-opacity duration-[180ms] " + (visible ? "opacity-100" : "opacity-0");

  return (
    <>
      <div
        aria-hidden="true"
        className={"pointer-events-none fixed z-40 rounded-stitch-xl " + fadeClass}
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 3px rgba(255,255,255,0.5), 0 0 0 9999px rgba(15,23,42,0.15)",
        }}
      />

      <div
        role="dialog"
        aria-label={t("aiOnboarding.title")}
        className={"fixed z-40 rounded-2xl border border-stitch-border bg-white p-6 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] " + fadeClass}
        style={{ top: rect.bottom + POPOVER_GAP, left: popoverLeft, width: POPOVER_WIDTH }}
      >
        <div
          aria-hidden="true"
          className="absolute h-3 w-3 rotate-45 border-l border-t border-stitch-border bg-white"
          style={{ top: -6, left: arrowLeft }}
        />

        <h3 className="text-base font-semibold text-primary-navy">{t("aiOnboarding.title")}</h3>
        <p className="mt-3 text-[13px] leading-[1.7] text-secondary">{t("aiOnboarding.description")}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[13px] text-secondary transition-colors hover:text-stitch-ink"
          >
            {t("aiOnboarding.dismiss")}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="rounded-stitch-xl bg-primary-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#152c6e]"
          >
            {t("aiOnboarding.cta")}
          </button>
        </div>
      </div>
    </>
  );
}
