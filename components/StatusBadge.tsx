export type CompanyStatus = "진행 중" | "내정" | "입사" | "불합격" | "지원 취소";

const STATUS_STYLES: Record<CompanyStatus, string> = {
  "진행 중": "bg-primary/10 text-primary",
  "내정": "bg-offer/10 text-offer",
  "입사": "bg-joined/10 text-joined",
  "불합격": "bg-error/10 text-error",
  "지원 취소": "bg-cancelled/10 text-cancelled",
};

export default function StatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        STATUS_STYLES[status]
      }
    >
      {status}
    </span>
  );
}
