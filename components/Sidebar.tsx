"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Home, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";

const NAV_ITEMS = [
  { labelKey: "sidebar.dashboard", href: "/", icon: Home },
  { labelKey: "sidebar.companies", href: "/companies", icon: Building2 },
  { labelKey: "sidebar.calendar", href: "/calendar", icon: CalendarDays },
  { labelKey: "sidebar.settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

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
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-150 " +
                (isActive
                  ? "bg-primary text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")
              }
            >
              <Icon size={18} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 py-6">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
        >
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
