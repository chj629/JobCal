"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// data-icon 값은 docs/stitch/메인페이지 5개/*/code.html의 SideNavBar와 1:1로 대응한다.
const NAV_ITEMS = [
  { labelKey: "sidebar.dashboard", href: "/dashboard", icon: "home" },
  { labelKey: "sidebar.companies", href: "/companies", icon: "business_center" },
  { labelKey: "sidebar.calendar", href: "/calendar", icon: "calendar_today" },
  { labelKey: "sidebar.analytics", href: "/analytics", icon: "bar_chart" },
];
const SETTINGS_ITEM = { labelKey: "sidebar.settings", href: "/settings", icon: "settings" };

function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// docs/stitch/메인페이지 5개의 SideNavBar를 그대로 재현한다. Stitch는 md 이상에서 항상
// 라벨 포함 전체 사이드바를 보여주고(태블릿용 아이콘 전용 축소 단계 없음) md 미만은
// 완전히 숨긴다. 로그아웃/프로필은 Stitch 화면에 없어 Header의 아바타 드롭다운으로 옮겼다
// (components/Header.tsx 참고).
export default function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stitch-border bg-primary-navy py-8 font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] md:flex">
        <div className="px-6 pb-8 pt-0.5">
          <h1 className="text-[28px] font-[700] leading-none tracking-tight text-white">
            {t("common.appName")}
          </h1>
          <p className="mt-1 text-[11px] tracking-normal text-white/70">{t("sidebar.tagline")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = isActiveHref(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-3 rounded-stitch-xl px-3 py-2 text-[15px] font-[350] transition-all duration-200 " +
                  (isActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white")
                }
              >
                <MaterialIcon name={item.icon} size={19} filled={isActive} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3">
          <Link
            href={SETTINGS_ITEM.href}
            className={
              "flex items-center gap-3 rounded-stitch-xl px-3 py-2 text-[13px] font-[350] transition-all duration-200 " +
              (isActiveHref(pathname, SETTINGS_ITEM.href)
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white")
            }
          >
            <MaterialIcon
              name={SETTINGS_ITEM.icon}
              size={19}
              filled={isActiveHref(pathname, SETTINGS_ITEM.href)}
            />
            {t(SETTINGS_ITEM.labelKey)}
          </Link>
        </div>
      </aside>

      {/* Stitch에 모바일(<md) 목업이 없어, 기존 하단 내비게이션 구조는 유지하고
          팔레트/아이콘 체계만 리뉴얼(primary-navy, Material Symbols)에 맞춘다. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-stitch-border bg-card md:hidden">
        {[...NAV_ITEMS, SETTINGS_ITEM].map((item) => {
          const isActive = isActiveHref(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150 " +
                (isActive ? "text-primary-navy" : "text-secondary")
              }
            >
              <MaterialIcon name={item.icon} size={20} filled={isActive} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
