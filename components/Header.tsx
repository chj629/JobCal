"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AiOnboardingHint from "@/components/AiOnboardingHint";
import { VIDEO_SRC as AI_ONBOARDING_STEP2_VIDEO_SRC } from "@/components/AiOnboardingStep2";

export interface HeaderProps {
  aiDrawerOpen: boolean;
  onOpenAiDrawer: () => void;
  // Step 1의 "AIで追加してみる" CTA를 누른 직후 app/(app)/layout.tsx가 Step 2(메일
  // 붙여넣기 데모)를 시작하도록 호출한다. Header는 실제 textarea에 접근할 수 없어
  // (AiMailDrawer와 형제 컴포넌트) Step 2 자체는 여기서 렌더링하지 않는다.
  onStartAiOnboardingStep2: () => void;
}

// user_metadata에 저장하는 온보딩 완료 플래그. lib/locale-context.tsx의 language,
// app/(app)/settings/page.tsx의 display_name과 완전히 같은 패턴(supabase.auth.
// updateUser({ data: {...} }))을 재사용한다 — 새 테이블/RLS/상태관리 시스템을
// 만들지 않는다. auth.users에 저장되므로 기기가 바뀌어도 그대로 유지된다.
const AI_ONBOARDING_SEEN_KEY = "ai_onboarding_seen";

function getInitials(name: string) {
  return name.trim().slice(0, 2);
}

// docs/stitch/메인페이지 5개의 TopAppBar를 재현한다. Stitch 목업에는 사이드바에 있던
// 프로필/로그아웃 UI가 없는 대신 우측 아바타 버튼만 있어, 기존 로그아웃 기능을
// 아바타 클릭 시 열리는 드롭다운으로 옮겨 연결한다(Sidebar.tsx 참고).
export default function Header({ aiDrawerOpen, onOpenAiDrawer, onStartAiOnboardingStep2 }: HeaderProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ primaryLine: string; email: string | null } | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const [showAiOnboarding, setShowAiOnboarding] = useState(false);

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

  // "신규 사용자가 처음 Dashboard에 진입했을 때만" — Header는 (app) 레이아웃
  // 전체에서 공유되므로, /dashboard일 때만 자동 표시 여부를 확인한다. 이미 본
  // 사용자는 user_metadata에 플래그가 저장되어 있어 다시 뜨지 않는다.
  useEffect(() => {
    if (pathname !== "/dashboard" || aiDrawerOpen) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.user_metadata?.[AI_ONBOARDING_SEEN_KEY]) return;
      setShowAiOnboarding(true);
    });
  }, [pathname, aiDrawerOpen]);

  // Step 1 hint가 뜨는 시점에 Step 2 영상을 미리 preload해둔다 — CTA를 누르고 실제로
  // Drawer가 열려 영상이 재생되기까지는 수 초의 여유가 있어, 그 사이 네트워크로 받아두면
  // video 요소가 마운트될 때 빈 프레임 없이 곧바로 재생을 시작할 수 있다.
  useEffect(() => {
    if (!showAiOnboarding) return;
    if (document.querySelector(`link[rel="preload"][href="${AI_ONBOARDING_STEP2_VIDEO_SRC}"]`)) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.type = "video/mp4";
    link.href = AI_ONBOARDING_STEP2_VIDEO_SRC;
    document.head.appendChild(link);
  }, [showAiOnboarding]);

  // 자동 표시든 "?" 아이콘으로 다시 본 것이든, 사용자가 실제로 CTA/"나중에" 중
  // 하나를 골라 닫을 때마다 플래그를 저장한다 — 이미 true여도 다시 쓰는 것은
  // 무해하므로 호출부에서 분기하지 않는다.
  function markAiOnboardingSeen() {
    // Step 1 종료 → Drawer 열기 → Step 2 시작이 일어나는 바로 그 클릭 핸들러와 같은
    // tick에서 실행되지 않도록 다음 매크로태스크로 미룬다 — updateUser는 USER_UPDATED
    // 인증 이벤트를 발생시키는데, 이 이벤트를 구독하는 lib/*-context.tsx들의 근본적인
    // 처리(불필요한 재조회 스킵)는 별도로 고쳤지만, "화면 전환과 분리"라는 원칙 자체를
    // 코드로도 명확히 하기 위해 여기서도 저장 시점을 화면 전환 이후로 늦춘다.
    setTimeout(() => {
      const supabase = createClient();
      supabase.auth.updateUser({ data: { [AI_ONBOARDING_SEEN_KEY]: true } });
    }, 0);
  }

  function handleStartAiOnboarding() {
    setShowAiOnboarding(false);
    markAiOnboardingSeen();
    // 순서 중요: ①기존 AI Drawer를 실제로 연다 → ②바로 Step 2 데모를 시작한다.
    onOpenAiDrawer();
    onStartAiOnboardingStep2();
  }

  function handleDismissAiOnboarding() {
    setShowAiOnboarding(false);
    markAiOnboardingSeen();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = profile ? getInitials(profile.primaryLine) : "";

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-stitch-border bg-card font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em]">
      <div className="flex h-full w-full items-center px-6">
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

        <div className="ml-auto flex items-center gap-3">
          {!aiDrawerOpen && (
            // 밝은 royal blue(#3B63C6)로 바꿨더니 Sidebar/企業を登録이 쓰는 navy와
            // 공유 색이 아니라 이 버튼만의 새 컬러라 오히려 더 동떨어져 보인다는
            // 피드백을 받았다 — 색은 다시 다른 Primary CTA와 완전히 같은
            // bg-primary-navy로 되돌리고, "특별함"은 색이 아니라 표면 마감으로만
            // 표현한다: 흰색 wash 8% + 아주 얇은 상단 인셋 하이라이트 + 하단 인셋
            // 다크엣지 + 작고 부드러운 아우터 섀도우, 테두리는 white/15의 얇은 라인
            // 하나. 멀리서 보면 그냥 navy 버튼, 가까이서 보면 마감만 조금 더 정교한
            // 정도를 목표로 한다. hover도 같은 navy 안에서 wash/하이라이트만 살짝
            // 밝아질 뿐 색 자체는 바뀌지 않는다 — transform/scale/rotate 없음. 형태
            // (rounded-stitch-xl pill, h-11, px-5)/타이포(font-medium 14px)/
            // onOpenAiDrawer 클릭 기능은 그대로다.
            <button
              ref={aiButtonRef}
              type="button"
              // Step 1 popover가 떠 있는 동안(showAiOnboarding)은 이 실제 버튼을 눌러도
              // popover의 CTA(AiOnboardingHint onStart)와 완전히 같은 handleStartAiOnboarding을
              // 그대로 재사용한다 — Drawer만 열고 Step 2를 우회하던 버그 수정. 새 Step 2
              // 진입 로직을 만들지 않고 기존 경로를 그대로 공유한다. popover가 없을 때는
              // 기존과 동일하게 onOpenAiDrawer만 호출한다.
              onClick={showAiOnboarding ? handleStartAiOnboarding : onOpenAiDrawer}
              className="flex h-11 shrink-0 items-center gap-2 rounded-stitch-xl border border-white/15 bg-primary-navy bg-[linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08))] px-5 text-sm font-medium tracking-normal text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(15,23,42,0.12)] transition-all duration-200 hover:bg-[linear-gradient(rgba(255,255,255,0.14),rgba(255,255,255,0.14))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.15),0_2px_5px_rgba(15,23,42,0.16)]"
            >
              <MaterialIcon name="auto_awesome" size={16} className="text-white" />
              {t("header.aiCta")}
            </button>
          )}

          {/* AI onboarding hint를 다시 볼 수 있는 진입점. 완료 여부와 무관하게 항상
              열 수 있어야 하므로 user_metadata를 확인/기록하지 않고 곧장 연다. */}
          <button
            type="button"
            onClick={() => setShowAiOnboarding(true)}
            aria-label={t("header.aiOnboardingHelp")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-all hover:bg-black/[0.02] hover:text-stitch-ink"
          >
            <MaterialIcon name="help" size={18} />
          </button>

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

    <AiOnboardingHint
      open={showAiOnboarding}
      anchorRef={aiButtonRef}
      onStart={handleStartAiOnboarding}
      onDismiss={handleDismissAiOnboarding}
    />
    </>
  );
}
