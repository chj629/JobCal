"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/locale-context";

export interface AiOnboardingStep3Props {
  active: boolean;
  // 실제 "登録" 버튼(EmailAnalysisReview.tsx) — 새 버튼을 만들지 않고 이 버튼 자체를
  // 감싸듯 강조한다.
  targetRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
}

// Step2와 같은 진입/퇴장 전환 박자를 그대로 재사용한다.
const TRANSITION_MS = 400;
const POPOVER_WIDTH = 280;
const POPOVER_GAP = 12;
const ARROW_SIZE = 12;

// AI 온보딩 Step 3: 분석 결과 화면(EmailAnalysisReview)의 실제 "登録" 버튼을 가리키는
// 마지막 안내. components/AiOnboardingStep2.tsx와 같은 시각 언어(white surface, 기존
// rounded-2xl/border-stitch-border, 얕은 shadow, primary-navy 제목 15px, 13px 설명,
// 11px muted 보조문구, 작은 스킵 텍스트 액션)를 그대로 재사용한다.
//
// Step2와 달리 화면 전체를 덮는 dim(box-shadow 9999px spread)은 쓰지 않는다 — 이
// 단계는 사용자가 분석 결과(기업명/전형/일정/담당자/메모)를 직접 읽고 수정해야
// 하므로, 결과 영역을 조금이라도 어둡게 하거나 가리면 안 되기 때문이다. 대신 실제
// 등록 버튼 주위에 기존 primary-navy 토큰(#1e3a8a)을 낮은 alpha로 두른 아주 옅은
// glow만 그려 "여기를 누르면 된다"는 것만 부드럽게 알려주고, 나머지 화면은 완전히
// 평소 그대로 두어 자유로운 확인/수정을 막지 않는다.
export default function AiOnboardingStep3({ active, targetRef, onDismiss }: AiOnboardingStep3Props) {
  const t = useT();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  // AiOnboardingHint.tsx/AiOnboardingStep2.tsx와 동일한 mounted/visible 패턴: active가
  // 꺼져도 즉시 사라지지 않고 fade-out(TRANSITION_MS)을 다 재생한 뒤에만 실제로
  // unmount한다 — "스킵/등록 클릭 → fade-out → 종료" 순서를 그대로 구현한다.
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawer.tsx/AiOnboardingHint.tsx와 동일한 이유: active prop 변화를 effect가 아니라
  // 렌더 중에 감지해 즉시 반영한다.
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setMounted(true);
    } else {
      setVisible(false);
    }
  }

  // review 단계에 도달했을 때는 이미 Drawer가 오래전에 열려 정착된 상태이므로(paste →
  // match → review를 실제로 거쳐 온 뒤이므로), AiOnboardingStep2의 rAF 안정화 폴링
  // 같은 절차 없이 곧장 재도 충분하다. resize/scroll에는 계속 갱신한다.
  useEffect(() => {
    if (!active) return;

    function measure() {
      const el = targetRef.current;
      if (el) setTargetRect(el.getBoundingClientRect());
    }

    measure();
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
    };
  }, [active, targetRef]);

  // mounted 직후 다음 프레임에 visible을 올려 opacity 전환이 실제로 재생되게 하고,
  // active가 꺼지면(위 렌더 중 분기에서 이미 visible=false) 전환이 끝날 시점에
  // 실제로 unmount한다.
  useEffect(() => {
    if (!mounted) return;

    if (!active) {
      timeoutRef.current = setTimeout(() => setMounted(false), TRANSITION_MS);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }

    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [active, mounted]);

  if (!mounted || !targetRect) return null;

  // 팝오버는 등록 버튼을 가리지 않도록 버튼 왼쪽-위 방향(버튼과 왼쪽 정렬, 그 위에
  // 배치)에 둔다 — AiOnboardingStep2의 buttonSpotlight 팝오버와 완전히 같은 위치 규칙.
  const popoverLeft = Math.max(24, targetRect.left);
  const popoverBottom = window.innerHeight - targetRect.top + POPOVER_GAP;

  return createPortal(
    <>
      {/* 화면을 dim하지 않는 대신, 실제 등록 버튼 주변에만 기존 primary-navy 토큰을
          낮은 alpha로 두른 옅은 glow를 그려 강조한다. pointer-events-none이라 버튼
          자체의 클릭/hover 등 기존 동작에는 전혀 영향을 주지 않는다. */}
      <div
        aria-hidden="true"
        className={
          "pointer-events-none fixed z-[55] rounded-full transition-opacity " +
          (visible ? "opacity-100" : "opacity-0")
        }
        style={{
          top: targetRect.top - 3,
          left: targetRect.left - 3,
          width: targetRect.width + 6,
          height: targetRect.height + 6,
          transitionDuration: `${TRANSITION_MS}ms`,
          boxShadow: "0 0 0 2px rgba(30,58,138,0.25), 0 0 14px 2px rgba(30,58,138,0.18)",
        }}
      />

      {/* z-[55]: AI Drawer 패널(z-50, 불투명 흰 배경)보다 위에 있어야 실제로 보인다
          (AiOnboardingStep2.tsx와 같은 이유). */}
      <div
        role="dialog"
        aria-label={t("aiOnboarding.step3.title")}
        className={
          "pointer-events-auto fixed z-[55] rounded-2xl border border-stitch-border bg-white p-5 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)] transition-opacity " +
          (visible ? "opacity-100" : "opacity-0")
        }
        style={{
          bottom: popoverBottom,
          left: popoverLeft,
          width: POPOVER_WIDTH,
          transitionDuration: `${TRANSITION_MS}ms`,
        }}
      >
        {/* 팝오버가 버튼 위에 있으므로 화살표는 아래(버튼 방향)를 가리킨다 —
            AiOnboardingStep2.tsx의 buttonSpotlight 팝오버 화살표와 동일. */}
        <div
          aria-hidden="true"
          className="absolute h-3 w-3 rotate-45 border-b border-r border-stitch-border bg-white shadow-[2px_2px_4px_-2px_rgba(15,23,42,0.12)]"
          style={{ bottom: -(ARROW_SIZE / 2), left: 24 }}
        />

        <h3 className="text-[15px] font-semibold text-primary-navy">
          {t("aiOnboarding.step3.title")}
        </h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-stitch-ink">
          {t("aiOnboarding.step3.description")}
        </p>
        <p className="mt-2 text-[11px] leading-[1.5] text-secondary">
          {t("aiOnboarding.step3.note")}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 text-[12px] text-secondary transition-colors hover:text-stitch-ink"
        >
          {t("aiOnboarding.step3.dismiss")}
        </button>
      </div>
    </>,
    document.body
  );
}
