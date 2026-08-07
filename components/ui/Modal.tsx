"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/locale-context";

export interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// CompanyForm.tsx가 쓰던 max-w-lg를 "md" 기본값으로 그대로 옮긴다. sm/lg는 아직 실제 사용처가
// 없어 참고할 시안이 없으므로, md를 기준으로 한 단계씩 좁고 넓은 값만 잡아둔다.
const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

// 포털 없이 CompanyForm.tsx가 쓰던 fixed inset-0 오버레이 구조를 그대로 사용한다.
// ESC/배경 클릭 닫기, body scroll lock은 이번 단계 범위가 아니라 추가하지 않는다.
export default function Modal({
  open = true,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
}: ModalProps) {
  const t = useT();
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={
          "w-full rounded-[10px] border border-border bg-card p-6 shadow-lg " +
          SIZE_CLASS[size] +
          (className ? " " + className : "")
        }
      >
        <div className="mb-4 flex items-center justify-between">
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

        {children}

        {footer && <div className="mt-2 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
