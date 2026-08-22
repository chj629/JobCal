"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AiOnboardingHint from "@/components/AiOnboardingHint";
import { VIDEO_SRC as AI_ONBOARDING_STEP2_VIDEO_SRC } from "@/components/AiOnboardingStep2";
import NotificationPanel from "@/components/NotificationPanel";
import { useEvents } from "@/lib/events-context";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { computeBillingNotification, computeNotifications, type AppNotification } from "@/lib/notifications";
import { useNotificationReads } from "@/lib/notification-reads";
import { useSubscriptionSummary } from "@/lib/paddle/useSubscriptionSummary";

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
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ primaryLine: string; email: string | null } | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const [showAiOnboarding, setShowAiOnboarding] = useState(false);

  // 알림센터: events/companies/applicationSteps는 이미 AppLayout이 감싼 Provider들이
  // 전량 로드해둔 상태를 그대로 쓴다 — Header가 알림을 위해 별도로 다시 fetch하지 않는다.
  const { events } = useEvents();
  const { companies } = useCompanies();
  const { steps } = useApplicationSteps();
  const { readKeys, markRead, markAllRead } = useNotificationReads();
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // 3단계: Paddle past_due 결제 알림. useCurrentPlan(Pro 판정)은 건드리지 않고 별도
  // 훅으로 status/subscriptionId만 읽는다 — 이 알림의 존재 여부가 Pro/Free 판정에
  // 영향을 주지 않는다(past_due도 기존처럼 Pro 유지).
  const subscriptionSummary = useSubscriptionSummary();
  const billingNotification = useMemo(
    () =>
      computeBillingNotification(
        subscriptionSummary?.subscriptionId ?? null,
        subscriptionSummary?.status ?? null,
        subscriptionSummary?.currentBillingPeriodStartsAt ?? null
      ),
    [subscriptionSummary]
  );

  const eventNotifications = useMemo(
    () => computeNotifications(events, companies, steps),
    [events, companies, steps]
  );
  // 결제 알림은 기업/일정보다 조치가 급한 편이라 목록 맨 위에 둔다. deadline/schedule
  // 알림끼리의 기존 정렬(시각 오름차순)은 그대로 유지된다.
  const notifications: AppNotification[] = useMemo(
    () => (billingNotification ? [billingNotification, ...eventNotifications] : eventNotifications),
    [billingNotification, eventNotifications]
  );
  const hasUnread = notifications.some((n) => !readKeys.has(n.key));

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

  // 계정 메뉴 "바깥 클릭 시 닫기". NotificationPanel.tsx와 동일한 이유로 풀스크린 backdrop
  // div 대신 document의 mousedown을 구독한다 — backdrop 방식은 알림 패널이 열려 있을 때
  // 이 메뉴 버튼을 덮어(반대 방향도 마찬가지) 첫 클릭이 backdrop에 막히고 두 번째 클릭에야
  // 메뉴가 열리는 문제가 있었다. mousedown 시점에 accountMenuRef/accountButtonRef 바깥인지만
  // 판정하고 아무 것도 가로막지 않으므로, 알림 패널이 열려 있는 상태에서 이 버튼을 눌러도
  // 같은 클릭 안에서 "알림 패널 닫힘(NotificationPanel 쪽 mousedown 리스너) + 계정 메뉴
  // 열림(이 버튼의 onClick)"이 함께 일어난다.
  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (accountMenuRef.current?.contains(target)) return;
      if (accountButtonRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

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

  // 계정 메뉴와 상호 배타적으로 열리게 한다(요청사항 5) — 한쪽을 열면 다른 쪽은 닫는다.
  function handleToggleNotifPanel() {
    setNotifPanelOpen((open) => !open);
    setIsMenuOpen(false);
  }

  function handleSelectNotification(notification: AppNotification) {
    markRead(notification.key);
    setNotifPanelOpen(false);
    if (notification.kind === "billing") {
      router.push("/settings?tab=plan");
    } else {
      router.push(`/companies/${notification.companyId}`);
    }
  }

  function handleMarkAllNotificationsRead() {
    const unreadKeys = notifications.filter((n) => !readKeys.has(n.key)).map((n) => n.key);
    markAllRead(unreadKeys);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(toPublicPageHref(locale, "/login"));
    router.refresh();
  }

  const initials = profile ? getInitials(profile.primaryLine) : "";

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-stitch-border bg-card font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em]">
      <div className="flex h-full w-full items-center px-6">
        {/* 모바일(<md)에서 열 수 있는 사이드바/드로어 구조가 없고, Sidebar.tsx의 하단
            내비게이션이 이미 데스크톱 사이드바와 동일한 5개 항목(대시보드/기업/캘린더/
            분석/설정)을 전부 제공한다 — 아무 동작도 연결되지 않은 채 남아있던 모바일
            전용 메뉴 버튼을 제거했다(자리를 차지하던 빈 wrapper는 데스크톱 레이아웃에
            영향이 없도록 그대로 둔다). */}
        <div className="flex-1"></div>

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
            ref={notifButtonRef}
            type="button"
            onClick={handleToggleNotifPanel}
            aria-label={t("header.notifications")}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-all hover:bg-black/[0.02] hover:text-stitch-ink"
          >
            <MaterialIcon name="notifications" size={18} />
            {/* 숫자 배지 대신 아주 작은 dot만 — 미읽음이 하나라도 있으면 표시(요청사항 2). */}
            {hasUnread && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary-navy ring-2 ring-card"
              />
            )}
          </button>

          <div className="relative">
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => {
                setIsMenuOpen((open) => !open);
                setNotifPanelOpen(false);
              }}
              aria-label={t("header.accountMenu")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-navy text-[11px] font-[500] text-white ring-1 ring-border transition-opacity hover:opacity-90"
            >
              {initials}
            </button>

            {isMenuOpen && (
              <div
                ref={accountMenuRef}
                className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-stitch-border bg-card py-1 text-left shadow-lg"
              >
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

    <NotificationPanel
      open={notifPanelOpen}
      anchorRef={notifButtonRef}
      notifications={notifications}
      readKeys={readKeys}
      onSelect={handleSelectNotification}
      onMarkAllRead={handleMarkAllNotificationsRead}
      onClose={() => setNotifPanelOpen(false)}
    />
    </>
  );
}
