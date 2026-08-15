"use client";

import { useEffect, useState, type ReactNode, type TransitionEvent } from "react";

export interface CompanyDetailModalProps {
  open: boolean;
  onClose: () => void;
  // 닫힘 fade-out이 끝나 실제로 unmount된 시점에만 호출된다. components/ui/Modal.tsx와
  // 동일한 open/onClose/onClosed 계약을 그대로 따른다 — 이 컴포넌트를 쓰는 쪽(모달 라우트
  // page.tsx)이 open을 false로 내리면 애니메이션이 끝난 뒤 onClosed에서 실제 router.back()을
  // 호출해, 라우트가 즉시 unmount되어 애니메이션이 잘리는 것을 막는다.
  onClosed?: () => void;
  children: ReactNode;
}

// app/(app)/@modal/(.)companies/[id]/page.tsx 전용 셸. Company Detail 자체의 UI/CRUD는
// 전혀 모르고(children으로만 받음) 라우팅상으로만 모달일 뿐 시각적으로는 일반 페이지처럼
// main 영역을 그대로 채운다 — dim 배경/여백/rounded/shadow 없이 열기·닫기 fade 애니메이션 +
// ESC 닫기 + 배경 스크롤 잠금만 책임진다. dim이 없어 바깥 클릭으로 닫는 동작은 없다(닫을
// 곳이 안 보이면 안 됨) — 패널 내부의 X 버튼은 CompanyDetailScreen이 이미 자체적으로
// 그리므로 이 셸은 별도 X를 그리지 않는다(중복 방지).
export default function CompanyDetailModal({
  open,
  onClose,
  onClosed,
  children,
}: CompanyDetailModalProps) {
  // components/ui/Modal.tsx, components/ui/Drawer.tsx와 동일한 mount/visible 패턴.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
    } else {
      setVisible(false);
    }
  }

  useEffect(() => {
    if (!open || !mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  // children(CompanyDetailScreen) 내부에도 자기 transition을 쓰는 요소가 있을 수 있어,
  // 그 transitionend가 DOM을 타고 여기까지 버블링돼 핸들러가 여러 번 호출될 수 있다.
  // target이 이 레이어 자신이 아니면 무시해야 onClosed(=router.back())가 중복 호출되지
  // 않는다 — 안 그러면 뒤로가기가 두 단계 이상 건너뛴다.
  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (!open) {
      setMounted(false);
      onClosed?.();
    }
  }

  if (!mounted) return null;

  return (
    // top-16/md:left-64: Header(h-16)와 Sidebar(md 이상 w-64)를 정확히 피해 <main> 영역만
    // 채운다. z-40: Header(z-30)보다는 위, 기존 Modal/ConfirmDialog/Drawer(z-50)보다는
    // 아래에 둬 상세 내부에서 여는 EventForm과 AI Drawer가 항상 이 위에 뜨게 한다. dim/여백/
    // rounded/shadow 없이 bg-card로 main 영역을 그대로 채워 라우팅만 모달이고 시각적으로는
    // 일반 페이지처럼 보이게 한다 — 열기/닫기는 opacity만 fade한다.
    <div
      role="dialog"
      aria-modal="true"
      className={
        "fixed top-16 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden bg-card transition-opacity duration-150 ease-out md:left-64 " +
        (visible ? "opacity-100" : "opacity-0")
      }
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
