"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Home, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "대시보드", href: "/", icon: Home },
  { label: "기업 관리", href: "/companies", icon: Building2 },
  { label: "일정 관리", href: "/calendar", icon: CalendarDays },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-white">
          <CalendarDays size={18} />
        </span>
        <span className="text-lg font-semibold text-white">JobCal</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-150 " +
                (isActive
                  ? "bg-primary text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")
              }
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <span className="mt-1 flex cursor-not-allowed items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-sidebar-foreground opacity-50">
          <Settings size={18} />
          설정
        </span>
      </nav>

      <div className="mt-auto px-3 py-6">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
