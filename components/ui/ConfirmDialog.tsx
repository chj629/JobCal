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

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-stitch-border bg-white shadow-sm"
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
                (isDanger ? "font-[500] text-error" : "text-secondary")
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
                "min-w-[100px] rounded-full px-6 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 " +
                (isDanger ? "bg-error" : "bg-primary-navy")
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
