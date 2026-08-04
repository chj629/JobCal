"use client";

import { type OverallStatus } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

const STATUS_STYLES: Record<OverallStatus, string> = {
  in_progress: "bg-primary/10 text-primary",
  offer: "bg-offer/10 text-offer",
  joined: "bg-joined/10 text-joined",
  rejected: "bg-error/10 text-error",
  cancelled: "bg-cancelled/10 text-cancelled",
};

const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};

export default function StatusBadge({ status }: { status: OverallStatus }) {
  const t = useT();

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        STATUS_STYLES[status]
      }
    >
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  );
}
