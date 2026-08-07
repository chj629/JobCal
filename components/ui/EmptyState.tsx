import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

// 41_empty.png 기준. description은 13_AiDrawerEmpty.png처럼 제목 아래 보조 설명이
// 필요한 곳(AI Drawer 빈 상태 등)에서만 선택적으로 사용한다.
export default function EmptyState({
  icon: Icon,
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={"flex flex-col items-center justify-center gap-2 py-6 text-center " + className}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-secondary">
        <Icon size={20} />
      </span>
      <p className="text-sm text-secondary">{title}</p>
      {description && <p className="text-xs text-secondary">{description}</p>}
    </div>
  );
}
