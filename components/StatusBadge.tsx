"use client";

import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import { type OverallStatus } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

// 기존 STATUS_STYLES 색상을 그대로 보존하는 매핑. offer는 --color-offer와 --color-primary가
// 동일한 색상(#2563EB)이라 primary variant를 재사용해도 시각적 차이가 없다.
const STATUS_VARIANTS: Record<OverallStatus, BadgeVariant> = {
  in_progress: "primary",
  offer: "primary",
  joined: "purple",
  rejected: "danger",
  cancelled: "neutral",
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

  return <Badge variant={STATUS_VARIANTS[status]}>{t(STATUS_LABEL_KEYS[status])}</Badge>;
}
