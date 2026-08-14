"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

export interface HeaderProps {
  aiDrawerOpen: boolean;
  onOpenAiDrawer: () => void;
}

function getInitials(name: string) {
  return name.trim().slice(0, 2);
}

// docs/stitch/메인페이지 5개의 TopAppBar를 재현한다. Stitch 목업에는 사이드바에 있던
// 프로필/로그아웃 UI가 없는 대신 우측 아바타 버튼만 있어, 기존 로그아웃 기능을
// 아바타 클릭 시 열리는 드롭다운으로 옮겨 연결한다(Sidebar.tsx 참고).
export default function Header({ aiDrawerOpen, onOpenAiDrawer }: HeaderProps) {
  const t = useT();
  const router = useRouter();
  const [profile, setProfile] = useState<{ primaryLine: string; email: string | null } | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = profile ? getInitials(profile.primaryLine) : "";

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-stitch-border bg-card px-8 font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em]">
      <div className="mx-auto flex h-full w-full max-w-[960px] items-center justify-between">
        <div className="flex-1">
          {/* docs/stitch: 모바일(<md)에서만 보이는 메뉴 버튼. Stitch에도 열린 상태(드로어)
              목업은 없고, 이 앱은 <md에서 Sidebar.tsx의 하단 내비게이션으로 이동을 대신
              제공하므로 이 버튼은 아직 동작을 연결하지 않은 자리만 유지한다. */}
          <button
            type="button"
            aria-label={t("header.menu")}
            className="-ml-2 p-2 text-stitch-ink md:hidden"
          >
            <MaterialIcon name="menu" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!aiDrawerOpen && (
            <button
              type="button"
              onClick={onOpenAiDrawer}
              className="flex items-center gap-1.5 rounded-full border border-stitch-border bg-background px-3 py-1.5 text-[11px] font-[400] text-secondary transition-all hover:bg-black/[0.02] hover:text-stitch-ink"
            >
              <MaterialIcon name="auto_awesome" size={14} />
              {t("common.appName")} AI
            </button>
          )}

          <button
            type="button"
            aria-label={t("header.notifications")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-all hover:bg-black/[0.02] hover:text-stitch-ink"
          >
            <MaterialIcon name="notifications" size={18} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={t("header.accountMenu")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-navy text-[11px] font-[500] text-white ring-1 ring-border transition-opacity hover:opacity-90"
            >
              {initials}
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-stitch-border bg-card py-1 text-left shadow-lg">
                  {profile && (
                    <div className="border-b border-stitch-border px-3 py-2">
                      <p className="truncate text-sm font-semibold text-stitch-ink">
                        {profile.primaryLine}
                      </p>
                      {profile.email && (
                        <p className="truncate text-xs text-secondary">{profile.email}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-stitch-ink hover:bg-background"
                  >
                    {t("sidebar.settings")}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-background"
                  >
                    {t("sidebar.logout")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
