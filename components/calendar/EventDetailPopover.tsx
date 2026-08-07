"use client";

import { CalendarDays, ListChecks, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppEvent, EventType } from "@/lib/events";
import { useLocale, useT } from "@/lib/locale-context";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface EventDetailPopoverProps {
  event: AppEvent;
  companyName: string;
  stepName: string | null;
  onClose: () => void;
}

// calendar/page.tsx, CompanySchedulePanel.tsx와 동일한 타입별 배지 색/라벨 매핑을 재사용한다.
const EVENT_TYPE_BADGE_VARIANT: Record<EventType, BadgeVariant> = {
  schedule: "primary",
  deadline: "warning",
  result_announcement: "purple",
};

const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

export default function EventDetailPopover({
  event,
  companyName,
  stepName,
  onClose,
}: EventDetailPopoverProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();

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
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <Badge variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]} size="sm">
              {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
            </Badge>
            <h2 className="mt-2 text-[16px] font-semibold text-foreground">{event.title}</h2>
            <p className="text-sm text-secondary">{companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-secondary hover:bg-background hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          {formattedAt && (
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-secondary" />
              <span className="text-foreground">{formattedAt}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="shrink-0 text-secondary" />
            <span className="text-foreground">{stepName ?? t("dashboard.noStepLabel")}</span>
          </div>
        </div>

        <Button
          type="button"
          className="mt-6 w-full"
          onClick={() => router.push(`/companies/${event.companyId}`)}
        >
          {t("calendar.viewCompanyDetail")}
        </Button>
      </div>
    </div>
  );
}
