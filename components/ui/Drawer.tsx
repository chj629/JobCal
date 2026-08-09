"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/locale-context";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  // 닫힘 transition이 완전히 끝나 실제로 unmount된 시점에만 호출된다(onClose는 닫기 요청
  // 시점, onClosed는 애니메이션까지 끝난 시점 — AppLayout이 AI 버튼을 Drawer가 화면에서
  // 완전히 사라진 뒤에만 다시 보여주기 위해 필요).
  onClosed?: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: "md" | "lg";
  className?: string;
}

// 7_homeAION.png(대시보드+Drawer 합성 시안) 실측 기준으로 좁힌 값. sm(640px) 미만에서는
// 화면 밖으로 잘리지 않도록 w-full, 그 이상에서는 프리셋 폭을 쓴다. AI Drawer 전용 폭이
// 아니라 범용 프리셋이라 이름은 md/lg로 둔다.
// sm: 구간을 max-[1599px]로 push 모드 미만까지만 한정한다 — Tailwind가 컴파일된 CSS에서
// 이름 있는 브레이크포인트(sm)를 임의 브레이크포인트(min-[1600px])보다 항상 뒤에 배치해,
// 범위를 겹치게 두면 1600px 이상에서도 sm:w-[460px]가 min-[1600px]:w-0을 이겨버려
// 닫힘 애니메이션이 아예 시작되지 않는 문제가 있었다(width가 안 바뀌니 transitionend도 발생 X).
const WIDTH_CLASS: Record<NonNullable<DrawerProps["width"]>, string> = {
  md: "w-full sm:max-[1599px]:w-[380px]",
  lg: "w-full sm:max-[1599px]:w-[460px]",
};

// min-[1600px](push 모드) 전용 목표 폭. overlay 폭(WIDTH_CLASS)과 같은 값이지만, 슬라이드가
// transform이 아니라 width 자체를 0에서 이 값으로 키우는 방식이라 별도 클래스로 둔다.
const PUSH_WIDTH_CLASS: Record<NonNullable<DrawerProps["width"]>, string> = {
  md: "min-[1600px]:w-[380px]",
  lg: "min-[1600px]:w-[460px]",
};

// push 모드에서 바깥 panel만 0→460px로 애니메이션되게 하고, 헤더 행(제목+X 버튼)과 내부
// 콘텐츠는 둘 다 처음부터 완성된 폭을 유지하도록 최소폭을 강제한다(panel의 overflow-hidden이
// 점진적으로 드러내는 창 역할). 헤더에도 적용해야 X 버튼이 폭 애니메이션 중 제목과 겹치며
// 위치가 흔들리지 않는다.
const PUSH_MIN_WIDTH_CLASS: Record<NonNullable<DrawerProps["width"]>, string> = {
  md: "min-[1600px]:min-w-[380px]",
  lg: "min-[1600px]:min-w-[460px]",
};

// components/ui/Modal.tsx와 동일한 카드 배경(bg-card), 보더(border-border), 그림자(shadow-lg),
// 라운드(10px, design.md 기준) 토큰을 재사용한다. 단, 배경 딤(bg-black/40)은 쓰지 않는다(아래 참고).
// Modal은 화면 중앙에 뜨는 형태라 4면 모두 두르지만, Drawer는 화면 오른쪽 끝에 붙으므로
// Sidebar.tsx가 자기 오른쪽 경계에만 border-r을 쓰는 것과 같은 방식으로 왼쪽 경계에만 보더를
// 두고, 화면 밖으로 나가는 오른쪽 모서리는 둥글리지 않는다.
export default function Drawer({
  open,
  onClose,
  onClosed,
  title,
  children,
  width = "md",
  className = "",
}: DrawerProps) {
  const t = useT();
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  // 1600px 이상(push 모드)에서는 body scroll을 잠그지 않기 위한 판단값. 서버 렌더에는
  // window가 없으므로 false로 시작하고, 마운트 이후에만 matchMedia로 실제 값을 반영한다.
  const [isPushMode, setIsPushMode] = useState(false);

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

  // 뷰포트가 1600px 경계를 넘나들 때도 body scroll 잠금 여부가 즉시 따라오도록 실시간으로
  // 구독한다(리사이즈 중 push↔overlay 전환 시 상태가 잘못 남지 않게).
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1600px)");
    // lib/locale-context.tsx의 localStorage 초기값 반영과 동일한 이유로, effect 본문에서
    // 곧바로 setState하지 않고 마이크로태스크로 한 틱 미룬다(react-hooks/set-state-in-effect 회피).
    queueMicrotask(() => setIsPushMode(mediaQuery.matches));

    function handleChange(event: MediaQueryListEvent) {
      setIsPushMode(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // ESC 닫기는 push/overlay 모드와 무관하게 패널이 화면에 실제로 붙어 있는 동안(닫히는
  // 애니메이션 포함) 항상 유지한다. body scroll lock만 overlay 모드(1600px 미만)에서만
  // 적용한다 — push 모드는 메인 콘텐츠가 그대로 보이므로 페이지 스크롤을 막을 이유가 없다.
  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    if (isPushMode) {
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
  }, [mounted, isPushMode, onClose]);

  function handlePanelTransitionEnd() {
    if (!open) {
      setMounted(false);
      onClosed?.();
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* 7_homeAION.png 시안은 Drawer가 열려도 배경(앱 Header 포함)을 딤 처리하지 않으므로,
          배경색 없이 backdrop 클릭 닫기용 전체 화면 클릭 영역만 남긴다. */}
      {/* min-[1600px] 이상은 AppLayout이 push 방식으로 붙이므로(main 옆 static flex item),
          바깥을 덮는 배경 클릭 닫기 영역이 메인 콘텐츠 클릭까지 가로채지 않도록 숨긴다. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 min-[1600px]:hidden"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onTransitionEnd={handlePanelTransitionEnd}
        className={
          "fixed inset-y-0 right-0 z-50 flex h-full flex-col overflow-hidden rounded-l-[10px] border-l border-border bg-card shadow-lg transition-transform duration-200 ease-out min-[1600px]:transition-[width] " +
          // push 모드(1600px 이상)에서는 슬롯 밖으로 translate하지 않도록 transform을 고정하고,
          // 대신 width를 0↔460px로 애니메이션해 뷰포트를 벗어나는 오버플로우 자체가 생기지 않게 한다.
          "min-[1600px]:static min-[1600px]:inset-auto min-[1600px]:z-auto min-[1600px]:h-screen min-[1600px]:min-w-0 min-[1600px]:shrink-0 min-[1600px]:translate-x-0 " +
          WIDTH_CLASS[width] +
          " " +
          (visible
            ? "translate-x-0 " + PUSH_WIDTH_CLASS[width]
            : "translate-x-full min-[1600px]:w-0") +
          (className ? " " + className : "")
        }
      >
        <div
          className={
            "flex items-center justify-between border-b border-border px-6 py-4 " +
            PUSH_MIN_WIDTH_CLASS[width]
          }
        >
          {title ? (
            <h2 id={titleId} className="text-[16px] font-semibold text-foreground">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-[8px] p-1 text-secondary hover:bg-background hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={
            "min-h-0 flex-1 overflow-y-auto p-6 " + PUSH_MIN_WIDTH_CLASS[width]
          }
        >
          {children}
        </div>
      </div>
    </>
  );
}
