"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  // 닫힘 transition이 완전히 끝나 실제로 unmount된 시점에만 호출된다(onClose는 닫기 요청
  // 시점, onClosed는 애니메이션까지 끝난 시점 — AppLayout이 AI 버튼을 Drawer가 화면에서
  // 완전히 사라진 뒤에만 다시 보여주기 위해 필요).
  onClosed?: () => void;
  title?: ReactNode;
  children: ReactNode;
  // 스크롤되는 content 영역과 분리된 고정(shrink-0) footer. 각 스텝 컴포넌트가
  // footerContainer prop으로 받은 DOM 노드에 자신의 버튼 영역을 portal로 렌더링하고,
  // 그 노드를 여기로 전달한다 — Drawer는 위치/테두리/여백만 책임지고 버튼 로직은
  // 그대로 각 스텝 컴포넌트에 남는다. 생략하면 footer 영역 자체를 렌더링하지 않는다.
  footer?: ReactNode;
  width?: "md" | "lg";
  className?: string;
}

// sm(640px) 미만은 overlay(화면 전체를 덮는 w-full), 그 이상은 오른쪽에 고정폭으로 뜬다.
// 두 구간 모두 position:fixed + translate-x 슬라이드로 동일하게 동작한다 — sm 이상에서도
// main을 밀어내지 않는다(공간이 부족하면 main이 자체적으로 가로 스크롤된다, app/(app)/layout.tsx
// 참고). docs/stitch/AI Drawer/*의 w-[440px] 실측(스크린샷 550px ÷ 1.25 스케일)을 그대로 쓴다.
// Drawer는 현재 AiMailDrawer.tsx(width="lg")만 쓰므로 다른 화면에 영향 없다.
const WIDTH_CLASS: Record<NonNullable<DrawerProps["width"]>, string> = {
  md: "w-full sm:w-[380px]",
  lg: "w-full sm:w-[440px]",
};

// docs/stitch/AI Drawer/*: 흰 배경 + 왼쪽으로 퍼지는 부드러운 그림자(shadow-[-16px...])만
// 쓰고 border/둥근 모서리는 전혀 없다(code.html에 rounded-*/border-l 클래스가 없음).
export default function Drawer({
  open,
  onClose,
  onClosed,
  title,
  children,
  footer,
  width = "md",
  className = "",
}: DrawerProps) {
  const t = useT();
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  // 640px(sm) 이상(오른쪽 고정폭 모드)에서는 body scroll을 잠그지 않기 위한 판단값. 서버
  // 렌더에는 window가 없으므로 false로 시작하고, 마운트 이후에만 matchMedia로 실제 값을 반영한다.
  const [isWideMode, setIsWideMode] = useState(false);

  // open prop 변경을 렌더 중에 감지해 즉시 반영한다(app/(app)/companies/page.tsx의
  // filterKey 비교와 동일한 패턴). effect 안에서 동기적으로 setState하지 않기 위함이다.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
    } else {
      setVisible(false);
    }
  }

  // mounted 직후 다음 프레임에 visible을 올려, 닫힌 위치(translate-x-full)에서 열린
  // 위치(translate-x-0)로의 전환이 실제로 재생되게 한다. requestAnimationFrame 콜백
  // 안에서만 setState하므로 위 렌더 중 갱신과 달리 effect로 둬도 안전하다.
  useEffect(() => {
    if (!open || !mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  // 뷰포트가 640px 경계를 넘나들 때도 body scroll 잠금 여부가 즉시 따라오도록 실시간으로
  // 구독한다(리사이즈 중 overlay↔고정폭 전환 시 상태가 잘못 남지 않게).
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    // lib/locale-context.tsx의 localStorage 초기값 반영과 동일한 이유로, effect 본문에서
    // 곧바로 setState하지 않고 마이크로태스크로 한 틱 미룬다(react-hooks/set-state-in-effect 회피).
    queueMicrotask(() => setIsWideMode(mediaQuery.matches));

    function handleChange(event: MediaQueryListEvent) {
      setIsWideMode(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // ESC 닫기는 폭 모드와 무관하게 패널이 화면에 실제로 붙어 있는 동안(닫히는 애니메이션
  // 포함) 항상 유지한다. body scroll lock만 모바일 overlay 모드(640px 미만)에서만 적용한다
  // — 640px 이상은 메인 콘텐츠가 그대로 보이고 조작 가능해야 하므로 페이지 스크롤을 막지 않는다.
  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    if (isWideMode) {
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, isWideMode, onClose]);

  function handlePanelTransitionEnd() {
    if (!open) {
      setMounted(false);
      onClosed?.();
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* docs/stitch/AI Drawer/*는 screen.png 4장 모두 Drawer가 열리면 배경을 옅게
          딤 처리한다(픽셀 실측: 대부분 #0d1c2f 5% 오버레이). 예전 참고 시안(7_homeAION.png,
          딤 없음)은 최신 배치로 대체됐다. */}
      {/* sm(640px) 이상은 main이 그대로 보이고 조작 가능해야 하므로, 바깥을 덮는 배경 클릭
          닫기 영역을 숨긴다(main 클릭까지 가로채지 않도록). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={
          "fixed inset-0 z-50 bg-[#0d1c2f]/5 transition-opacity duration-200 ease-out sm:hidden " +
          (visible ? "opacity-100" : "opacity-0")
        }
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onTransitionEnd={handlePanelTransitionEnd}
        className={
          // position:fixed + inset-y-0(top:0;bottom:0)만으로 뷰포트 높이가 결정된다 — 예전처럼
          // h-full(height:100%)을 같이 주면 top/height/bottom이 모두 non-auto가 되어 브라우저가
          // 'bottom'을 무시하고 재계산하는 overconstrained 케이스가 된다(스펙상 결과값은 같지만
          // 이 모호함을 아예 없애기 위해 height 선언을 두지 않는다). sm(640px) 이상에서도 항상
          // fixed로 두어 main을 밀어내지 않는다 — main이 좁아지지 않고, 부족한 공간은
          // app/(app)/layout.tsx의 <main overflow-x-auto>가 가로 스크롤로 흡수한다.
          "fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden bg-white shadow-[-16px_0_48px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-out " +
          WIDTH_CLASS[width] +
          " " +
          (visible ? "translate-x-0" : "translate-x-full") +
          (className ? " " + className : "")
        }
      >
        <div
          className={
            // h-16(64px): app 공통 Header(components/Header.tsx)와 동일한 높이 — sm(640px)
            // 이상에서 Drawer가 뷰포트 y=0에서 시작해 두 헤더의 border-b가 같은 y좌표에 놓인다.
            "flex h-16 shrink-0 items-center justify-between border-b border-stitch-border px-10 font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em]"
          }
        >
          {title ? (
            <h2 id={titleId} className="text-[16px] font-[500] text-stitch-ink">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-black/[0.02] hover:text-stitch-ink"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-10 py-10 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink"
        >
          {children}
        </div>

        {/* docs/stitch/AI Drawer의 code.html 4개 전부 footer 마크업이 동일: 별도 박스가
            아니라 "<div class="mt-auto pt-8 flex gap-3">"로, content 영역과 같은 흰 배경 위에
            border 없이 위쪽 32px(pt-8) 간격만 두고, 그 아래는 content 래퍼 자체의
            pb-12(48px)가 여백 역할을 한다(px-10/py-10.md 시안 실측 결과, button 자체
            width/height는 각 스텝 컴포넌트의 py-3.5·py-4가 이미 시안과 일치 — 문제는
            이전에 추가했던 border-t/min-h-[104px]가 시안에 없는 "두꺼운 박스"처럼
            보이게 한 것이었음).
            여기서는 스크롤과 무관하게 항상 보이도록 여전히 별도 shrink-0 영역으로 분리해
            두되(header/content/footer 구조 유지), 시각적으로는 border/최소높이 없이
            content와 이어진 것처럼 pt-8 + pb-12(시안의 content pb-12와 동일)만 적용해
            시안과 동일한 자연스러운 여백으로 재현한다. */}
        {footer && (
          <div className="shrink-0 bg-white px-10 pt-8 pb-12">{footer}</div>
        )}
      </div>
    </>
  );
}
