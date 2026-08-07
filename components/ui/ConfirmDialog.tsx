"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

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

// 23_DeleteCompanyDialog.png / 26_DeleteScheduleDialog.png 참고. 시안의 삭제 데이터 목록,
// 트래시 아이콘, "다시 표시 안 함" 체크박스 등은 이번 최소 API 범위를 넘어서므로 넣지 않는다.
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = isLoading || isSubmitting;

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
    <Modal title={title} onClose={onCancel} size="sm">
      {description && <p className="text-sm text-secondary">{description}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={handleConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
