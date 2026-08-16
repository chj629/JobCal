"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

// docs/stitch/모달다이어로그/jobcal_standard_delete_dialog_company_example/screen.png 기준.
// 표준 Modal(헤더 좌측 정렬 + 별도 backdrop opacity(40%))과 시각 구조가 상당히 달라(중앙
// 정렬 아이콘+텍스트, X 버튼이 카드 우상단에 절대 위치, backdrop 20%) Modal을 감싸는 대신
// 이 컴포넌트 자체가 backdrop+카드를 직접 그린다. 열기/닫기, ESC, backdrop 클릭,
// confirm/cancel, loading 처리는 기존 로직 그대로 유지한다.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = isLoading || isSubmitting;
  const isDanger = variant === "danger";

  // components/ui/Drawer.tsx와 동일한 mount/visible 패턴. 이 컴포넌트는 대부분의 사용처에서
  // 항상 마운트된 채 open prop만 토글되므로(예: <ConfirmDialog open={!!deleteTarget} .../>),
  // open이 false가 돼도 즉시 사라지지 않고 fade-out이 끝난 뒤에야 실제로 렌더를 멈춘다.
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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onCancel]);

  function handleBackdropTransitionEnd() {
    if (!open) setMounted(false);
  }

  if (!mounted) return null;

  async function handleConfirm() {
    if (busy) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={
        "fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 transition-opacity duration-150 ease-out " +
        (visible ? "opacity-100" : "opacity-0")
      }
      onClick={onCancel}
      onTransitionEnd={handleBackdropTransitionEnd}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={
          "relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-stitch-border bg-white shadow-sm transition-[opacity,transform] duration-150 ease-out " +
          (visible ? "opacity-100 scale-100" : "opacity-0 scale-[0.97]")
        }
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label={t("common.close")}
          className="absolute top-6 right-6 text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MaterialIcon name="close" size={20} />
        </button>

        <div className="flex flex-col items-center p-10 text-center">
          <span
            className={
              "mb-6 flex h-12 w-12 items-center justify-center rounded-full " +
              (isDanger ? "bg-error/10 text-error" : "bg-primary-navy/10 text-primary-navy")
            }
          >
            <MaterialIcon name={isDanger ? "warning" : "help"} size={24} />
          </span>

          <h3 className="mb-3 text-[20px] font-[500] text-primary-navy">{title}</h3>

          {description && (
            <p
              className={
                "text-[13px] leading-relaxed " +
                // text-error(#ef4444)는 흰 배경 대비 약 3.8:1로 13px 텍스트에는 WCAG AA(4.5:1)에
                // 못 미친다. 버튼(bg-error)이나 다른 화면의 error 사용처는 그대로 두고, 이 삭제
                // 확인 설명문만 같은 red 계열에서 더 진한 값(#dc2626, 대비 약 4.8:1)을 직접 써서
                // AA를 통과시킨다 — --color-error 전역 토큰은 바꾸지 않는다.
                (isDanger ? "font-[500] text-[#dc2626]" : "text-secondary")
              }
            >
              {description}
            </p>
          )}

          <div className="mt-10 flex w-full items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-w-[100px] rounded-full border border-stitch-border px-6 py-2.5 text-[14px] font-[500] text-secondary transition-all hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={
                "inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 " +
                (isDanger ? "bg-error" : "bg-primary-navy")
              }
            >
              {busy && <MaterialIcon name="progress_activity" size={16} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
