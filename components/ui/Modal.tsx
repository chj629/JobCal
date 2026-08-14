"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

export interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title?: string;
  // 시안(企業を追加)의 제목 아래 보조 설명 한 줄. 선택적이라 안 넘기면 기존처럼 제목만 보인다.
  description?: string;
  children: ReactNode;
  // px-8 pt-6 pb-8 gap-3 justify-end로 본문(children)과 분리된 고정 영역에 렌더링된다.
  // 안 넘기면(기존 EventForm 등처럼 폼 내부에 자체 버튼 행을 두는 경우) 이 영역 자체가
  // 렌더링되지 않아 기존 동작 그대로 유지된다.
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// docs/stitch/모달다이어로그/jobcal_standard_modal_design_company_registration_example/
// screen.png 기준. 기존 max-w-lg(512px)를 시안 실측값(560px)으로 교체하고, sm/lg는 실제
// 사용처가 없어(회사 등록/수정 폼만 md를 쓴다) 비율만 맞춰 남겨둔다.
const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

export default function Modal({
  open = true,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className = "",
}: ModalProps) {
  const t = useT();
  const titleId = useId();

  // ESC로 닫기. backdrop 클릭 닫기는 아래 배경 div의 onClick(카드 자체는 stopPropagation)으로 처리한다.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
        className={
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-stitch-border bg-white shadow-lg " +
          SIZE_CLASS[size] +
          (className ? " " + className : "")
        }
      >
        <div className="flex shrink-0 items-start justify-between px-8 pt-8 pb-6">
          <div>
            {title && (
              <h2
                id={titleId}
                className="text-[24px] font-[500] tracking-tight text-primary-navy"
              >
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-[14px] text-secondary">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 text-secondary transition-colors hover:text-foreground"
          >
            <MaterialIcon name="close" size={22} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-8 pb-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-3 px-8 pt-6 pb-8">{footer}</div>
        )}
      </div>
    </div>
  );
}
