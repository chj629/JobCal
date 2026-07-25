"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "대시보드", href: "/" },
  { label: "기업 관리", href: "/companies" },
  { label: "일정 관리", href: null },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-6 py-6">
        <span className="text-lg font-semibold text-foreground">JobCal</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href
            ? item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
            : false;

          const className =
            "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150 " +
            (isActive
              ? "bg-primary/10 text-primary"
              : "text-secondary hover:bg-background hover:text-foreground");

          if (!item.href) {
            return (
              <span key={item.label} className={className}>
                {item.label}
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
