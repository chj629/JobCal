"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, CalendarDays, Home, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import Logo from "@/components/ui/Logo";

const NAV_ITEMS = [
  { labelKey: "sidebar.dashboard", href: "/dashboard", icon: Home },
  { labelKey: "sidebar.companies", href: "/companies", icon: Building2 },
  { labelKey: "sidebar.calendar", href: "/calendar", icon: CalendarDays },
  { labelKey: "sidebar.analytics", href: "/analytics", icon: BarChart3 },
  { labelKey: "sidebar.settings", href: "/settings", icon: Settings },
];

function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// dashboard/page.tsx, settings/page.tsx와 동일하게 supabase.auth.getUser()의
// user_metadata.display_name만 사용한다(별도 profiles 테이블 없음). display_name이
// 없으면 이메일을 이름 자리에 대신 표시하고, 그 경우 이메일 줄은 중복이라 생략한다.
function getInitials(name: string) {
  return name.trim().slice(0, 2);
}

// 40_navi.png 기준. 데스크톱(lg 이상)은 기존 라벨 포함 Sidebar를 유지하고,
// 태블릿(md~lg)은 아이콘만 남긴 축소형 Sidebar, 모바일(md 미만)은 Sidebar 대신
// 하단 Bottom Navigation을 보여준다. 세 블록 모두 이 컴포넌트 하나에서 반응형
// 클래스로 전환하며(JS 기반 뷰포트 분기 없음), 항상 셋 중 하나만 보인다.
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [profile, setProfile] = useState<{ primaryLine: string; email: string | null } | null>(
    null
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const name = user.user_metadata?.display_name;
      const displayName = typeof name === "string" ? name.trim() : "";
      const email = user.email ?? "";

      setProfile({
        primaryLine: displayName || email,
        email: displayName ? email : null,
      });
    });
  }, []);

  const initials = profile ? getInitials(profile.primaryLine) : "";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* 데스크톱: 기존 Sidebar 그대로 (lg 이상에서만 표시) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center border-b border-sidebar-border px-6 py-6">
          <Logo size="md" textClassName="text-white" />
        </div>

        <nav className="flex flex-col gap-1 px-3 pt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = isActiveHref(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 " +
                  (isActive
                    ? "bg-primary font-semibold text-white"
                    : "font-medium text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")
                }
              >
                <Icon size={18} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border px-3 py-4">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{profile.primaryLine}</p>
                {profile.email && (
                  <p className="truncate text-xs text-sidebar-foreground">{profile.email}</p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
          >
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>

      {/* 태블릿: 아이콘만 남긴 축소형 Sidebar (md 이상 lg 미만) */}
      <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar md:flex lg:hidden">
        <div className="flex w-full items-center justify-center border-b border-sidebar-border py-6">
          <Logo size="md" iconOnly />
        </div>

        <nav className="flex w-full flex-col items-center gap-1 pt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = isActiveHref(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 " +
                  (isActive
                    ? "bg-primary text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")
                }
              >
                <Icon size={20} />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex w-full flex-col items-center gap-2 border-t border-sidebar-border py-4">
          {profile && (
            <span
              title={profile.email ? `${profile.primaryLine} (${profile.email})` : profile.primaryLine}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
            >
              {initials}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title={t("sidebar.logout")}
            aria-label={t("sidebar.logout")}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* 모바일: Sidebar 대신 하단 Bottom Navigation (md 미만) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-border bg-card md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = isActiveHref(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150 " +
                (isActive ? "text-primary" : "text-secondary")
              }
            >
              <Icon size={20} />
              {t(item.labelKey)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          title={t("sidebar.logout")}
          aria-label={t("sidebar.logout")}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-secondary transition-colors duration-150"
        >
          <LogOut size={20} />
        </button>
      </nav>
    </>
  );
}
