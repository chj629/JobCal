import { OVERALL_STATUS_LABELS, type OverallStatus } from "@/lib/companies";

const STATUS_STYLES: Record<OverallStatus, string> = {
  in_progress: "bg-primary/10 text-primary",
  offer: "bg-offer/10 text-offer",
  joined: "bg-joined/10 text-joined",
  rejected: "bg-error/10 text-error",
  cancelled: "bg-cancelled/10 text-cancelled",
};

export default function StatusBadge({ status }: { status: OverallStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        STATUS_STYLES[status]
      }
    >
      {OVERALL_STATUS_LABELS[status]}
    </span>
  );
}
