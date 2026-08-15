"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppEvent } from "@/lib/events";
import { useLocale, useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { EVENT_CHIP_CLASS } from "@/components/calendar/eventChipStyle";

interface EventDetailPopoverProps {
  event: AppEvent;
  companyName: string;
  stepName: string | null;
  checked: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EVENT_TYPE_LABEL_KEYS = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
} as const;

// Stitch 캘린더 시안에는 "일정 클릭 → 상세" 상태가 없어, 표준 Modal(폼용 header+footer)로
// 억지로 맞추지 않고 ConfirmDialog와 같은 방식(공용 Modal을 감싸지 않는 독립 오버레이)으로
// 기존 중앙 오버레이 구조를 유지한 채 현재 디자인 토큰만 입힌다.
export default function EventDetailPopover({
  event,
  companyName,
  stepName,
  checked,
  onToggleComplete,
  onClose,
  onEdit,
  onDelete,
}: EventDetailPopoverProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const at = event.startsAt ?? event.dueAt;
  const formattedAt = at
    ? new Date(at).toLocaleString(localeCode, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] overflow-hidden rounded-[24px] border border-stitch-border bg-white p-7 shadow-sm"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <span
              className={
                "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-[500] " +
                EVENT_CHIP_CLASS[event.eventType]
              }
            >
              {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
            </span>
            <h2 className="mt-3 text-[18px] font-[500] text-stitch-ink">{event.title}</h2>
            <p className="text-[13px] text-secondary">{companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 text-secondary transition-colors hover:text-foreground"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-[13px] text-stitch-ink">
          {formattedAt && (
            <div className="flex items-center gap-2">
              <MaterialIcon name="calendar_today" size={16} className="shrink-0 text-secondary" />
              <span>{formattedAt}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MaterialIcon name="checklist" size={16} className="shrink-0 text-secondary" />
            <span>{stepName ?? t("dashboard.noStepLabel")}</span>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-[13px] text-stitch-ink">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleComplete}
            className="h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-stitch-border bg-background text-primary-navy focus:ring-0 focus:ring-offset-0"
          />
          {t("calendar.eventDetail.markComplete")}
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1 rounded-full border border-stitch-border px-4 py-2 text-[13px] font-[500] text-stitch-ink transition-colors hover:bg-black/[0.02]"
          >
            <MaterialIcon name="edit" size={14} />
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-1 rounded-full border border-error/30 px-4 py-2 text-[13px] font-[500] text-error transition-colors hover:bg-error/5"
          >
            <MaterialIcon name="delete" size={14} />
            {t("common.delete")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/companies/${event.companyId}`)}
          className="mt-2 w-full rounded-full bg-primary-navy px-6 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90"
        >
          {t("calendar.viewCompanyDetail")}
        </button>
      </div>
    </div>
  );
}
