import MaterialIcon from "@/components/ui/MaterialIcon";

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  className?: string;
}

// 41_empty.png 기준. description은 13_AiDrawerEmpty.png처럼 제목 아래 보조 설명이
// 필요한 곳(AI Drawer 빈 상태 등)에서만 선택적으로 사용한다. icon은 Material Symbols
// 리거처 이름(예: "search_off")이며, 각 호출부 헤더 아이콘과 동일한 이름을 재사용해
// 카드 내에서 아이콘 의미가 일관되게 유지되도록 한다.
export default function EmptyState({
  icon,
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={"flex flex-col items-center justify-center gap-2 py-6 text-center " + className}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-secondary">
        <MaterialIcon name={icon} size={20} />
      </span>
      <p className="text-sm text-secondary">{title}</p>
      {description && <p className="text-xs text-secondary">{description}</p>}
    </div>
  );
}
