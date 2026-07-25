const NAV_ITEMS = [
  { label: "대시보드", active: true },
  { label: "기업 관리", active: false },
  { label: "일정 관리", active: false },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-6 py-6">
        <span className="text-lg font-semibold text-foreground">JobCal</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <span
            key={item.label}
            className={
              "rounded-[10px] px-3 py-2 text-sm font-medium " +
              (item.active
                ? "bg-primary/10 text-primary"
                : "text-secondary")
            }
          >
            {item.label}
          </span>
        ))}
      </nav>
    </aside>
  );
}
