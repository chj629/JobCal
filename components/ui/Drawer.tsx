"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/locale-context";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: "md" | "lg";
  className?: string;
}

// 7_homeAION.png(대시보드+Drawer 합성 시안) 실측 기준으로 좁힌 값. sm(640px) 미만에서는
// 화면 밖으로 잘리지 않도록 w-full, 그 이상에서는 프리셋 폭을 쓴다. AI Drawer 전용 폭이
// 아니라 범용 프리셋이라 이름은 md/lg로 둔다.
const WIDTH_CLASS: Record<NonNullable<DrawerProps["width"]>, string> = {
  md: "w-full sm:w-[380px]",
  lg: "w-full sm:w-[460px]",
};

// components/ui/Modal.tsx와 동일한 카드 배경(bg-card), 보더(border-border), 그림자(shadow-lg),
// 라운드(10px, design.md 기준) 토큰을 재사용한다. 단, 배경 딤(bg-black/40)은 쓰지 않는다(아래 참고).
// Modal은 화면 중앙에 뜨는 형태라 4면 모두 두르지만, Drawer는 화면 오른쪽 끝에 붙으므로
// Sidebar.tsx가 자기 오른쪽 경계에만 border-r을 쓰는 것과 같은 방식으로 왼쪽 경계에만 보더를
// 두고, 화면 밖으로 나가는 오른쪽 모서리는 둥글리지 않는다.
export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = "md",
  className = "",
}: DrawerProps) {
  const t = useT();
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

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

  // ESC 닫기 + body scroll lock은 패널이 화면에 실제로 붙어 있는 동안(닫히는 애니메이션
  // 포함) 유지한다.
  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  function handlePanelTransitionEnd() {
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  return (
    <>
      {/* 7_homeAION.png 시안은 Drawer가 열려도 배경(앱 Header 포함)을 딤 처리하지 않으므로,
          배경색 없이 backdrop 클릭 닫기용 전체 화면 클릭 영역만 남긴다. */}
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onTransitionEnd={handlePanelTransitionEnd}
        className={
          "fixed inset-y-0 right-0 z-50 flex h-full flex-col rounded-l-[10px] border-l border-border bg-card shadow-lg transition-transform duration-200 ease-out " +
          WIDTH_CLASS[width] +
          " " +
          (visible ? "translate-x-0" : "translate-x-full") +
          (className ? " " + className : "")
        }
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
