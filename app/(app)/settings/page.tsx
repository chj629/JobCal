"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, Lock, Sparkles, User, type LucideIcon } from "lucide-react";
import { translate, useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/client";
import {
  getUserSubscriptionSummary,
  type UserSubscriptionSummary,
} from "@/lib/paddle/getUserSubscriptionSummary";
import { usePaddleCheckout } from "@/lib/paddle/usePaddleCheckout";
import { dateKeyOf } from "@/lib/date";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MaterialIcon from "@/components/ui/MaterialIcon";
import LoadingState from "@/components/ui/LoadingState";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

const MIN_PASSWORD_LENGTH = 6;

// docs/stitch/설정페이지/jobcal_settings_profile_sophisticated_refresh에는 메일 필드가
// 왜 비활성인지 설명하는 문구가 없다. 기본 화면에서는 숨기고 필요해지면 true로 되돌린다.
const SHOW_EMAIL_HINT = false;

type SettingsTab = "profile" | "account" | "plan" | "language";

const TABS: Array<{ key: SettingsTab; labelKey: string; icon: LucideIcon }> = [
  { key: "profile", labelKey: "settings.tabs.profile", icon: User },
  { key: "account", labelKey: "settings.tabs.account", icon: Lock },
  { key: "plan", labelKey: "settings.tabs.plan", icon: Sparkles },
  { key: "language", labelKey: "settings.tabs.language", icon: Globe },
];

const LANGUAGE_OPTIONS: Array<{ value: Locale; labelKey: string }> = [
  { value: "ja", labelKey: "settings.japanese" },
  { value: "ko", labelKey: "settings.korean" },
];

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  // null = 아직 조회 전(로딩). paddle_subscriptions(webhook이 채우는 source of truth)를
  // 읽어서만 정해지고, 체크아웃 성공 콜백이나 Customer Portal 이동 등 클라이언트 쪽에서
  // 직접 "pro"로 바꾸거나 상태를 조작하는 경로는 없다.
  const [subscription, setSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // docs/stitch/설정페이지/jobcal_settings_language_sophisticated_refresh는 드롭다운에서
  // 고른 값을 "変更を保存"를 눌러야 실제로 반영하는 구조다(기존 버튼 2개를 즉시 전환하던
  // 방식과 다름). 실제 반영/저장은 그대로 LocaleContext의 setLocale을 재사용한다.
  const [pendingLocale, setPendingLocale] = useState<Locale>(locale);

  useEffect(() => {
    // lib/locale-context.tsx의 LocaleProvider와 동일한 이유로 microtask로 한 틱 미뤄
    // effect 본문에서 동기적으로 setState하지 않는다(react-hooks/set-state-in-effect 회피).
    queueMicrotask(() => setPendingLocale(locale));
  }, [locale]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
      setUserId(user?.id ?? null);
      const name = user?.user_metadata?.display_name;
      const safeName = typeof name === "string" ? name : "";
      setDisplayName(safeName);
      setInitialName(safeName);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    getUserSubscriptionSummary(supabase).then(setSubscription);
  }, []);

  // Paddle Customer Portal 세션 발급. 서버(app/api/paddle/portal)가 현재 로그인 세션의
  // user.id로만 paddle_customer_id를 조회하므로, 여기서는 클라이언트가 어떤 값도 넘기지
  // 않는다 — customerId를 body로 보내는 방식은 아예 없다. 매 클릭마다 새 세션을 받아야
  // 하므로(1회성/시간 제한 URL) 응답을 캐시하지 않는다.
  async function handleManageSubscriptionClick() {
    if (isPortalLoading) return;

    setIsPortalLoading(true);
    try {
      const response = await fetch("/api/paddle/portal", { method: "POST" });
      const body = await response.json();

      if (!response.ok || typeof body.url !== "string") {
        showToast(t("settings.plan.portalError"), "error");
        setIsPortalLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      showToast(t("settings.plan.portalError"), "error");
      setIsPortalLoading(false);
    }
  }

  // Paddle Checkout(플랜 탭) 초기화/오픈은 랜딩/ /pricing과 공유하는 훅으로 옮겼다
  // (lib/paddle/usePaddleCheckout.ts) — 동작은 이전과 동일하다.
  const { isReady: isPaddleReady, isCheckoutBusy, openCheckout } = usePaddleCheckout({
    userId,
    email,
    locale,
  });

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setIsSaving(false);

    if (error) {
      showToast(t("settings.profile.saveError"), "error");
      return;
    }

    setDisplayName(trimmed);
    setInitialName(trimmed);
    showToast(t("settings.profile.saveSuccess"));
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast(t("auth.errors.allFieldsRequired"), "error");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(t("auth.errors.passwordMinLength", { min: MIN_PASSWORD_LENGTH }), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t("auth.errors.passwordMismatch"), "error");
      return;
    }

    setIsChangingPassword(true);
    const supabase = createClient();

    // 現在のパスワード로 항상 재인증한다. signInWithPassword는 성공 시 현재 세션을 같은
    // 사용자의 새 세션으로 갱신하므로 로그인 상태는 끊기지 않는다. Google 등 OAuth로만
    // 가입해 비밀번호가 없는 계정은 어떤 값을 넣어도 이 단계가 항상 실패한다 — Supabase가
    // "비밀번호 없음"과 "비밀번호 틀림"을 구분해 알려주지 않고(보안상 동일한 에러), 클라이언트
    // 에서도 계정에 비밀번호가 설정돼 있는지 미리 확인할 방법이 없기 때문이다(updateUser로
    // 비밀번호를 추가해도 identities/app_metadata에는 반영되지 않아 실제로 확인해봐도
    // 구분이 불가능했다). 그런 계정은 기존 "비밀번호를 잊으셨나요" 재설정 메일 흐름으로
    // 최초 비밀번호를 만들어야 한다(이 화면은 건드리지 않는다).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reauthError) {
      setIsChangingPassword(false);
      showToast(t("settings.account.currentPasswordIncorrect"), "error");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      showToast(t("auth.errors.updateFailed"), "error");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showToast(t("settings.account.saveSuccess"));
  }

  // docs/stitch/설정페이지/jobcal_settings_account_sophisticated_refresh의 "アカウント削除"
  // 버튼. 클릭하면 바로 지우지 않고 components/ui/ConfirmDialog(danger variant)로 최종
  // 확인을 먼저 받는다 — 다른 삭제 흐름(CompanySchedulePanel 등)과 동일한 패턴.
  function handleDeleteAccountClick() {
    setIsDeleteConfirmOpen(true);
  }

  // 실제 삭제는 app/api/account/delete가 서버에서 현재 세션 사용자만 골라
  // auth.admin.deleteUser로 처리한다(company_id/user_id 등을 클라이언트가 넘기지 않음).
  // companies 등 사용자 관련 테이블은 전부 auth.users(id)를 ON DELETE CASCADE로 참조하므로
  // (supabase/migrations 참고) 이 호출 하나로 나머지 데이터가 DB에서 함께 삭제된다 — 프론트에서
  // 테이블을 하나씩 지우지 않는다. 중복 요청 방지는 ConfirmDialog가 자체 isSubmitting으로
  // 이미 처리한다(busy일 때 onConfirm을 다시 호출하지 않음).
  async function handleConfirmDeleteAccount() {
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) {
        showToast(t("settings.account.deleteSection.error"), "error");
        return;
      }

      // auth.users 행은 이미 서버에서 삭제됐지만, 브라우저에 남아있는 세션 쿠키/토큰은
      // 별도로 정리해야 한다.
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      showToast(t("settings.account.deleteSection.error"), "error");
    }
  }

  function handleSaveLanguage() {
    setLocale(pendingLocale);
    showToast(translate(pendingLocale, "settings.languageSaveSuccess"));
  }

  return (
    // docs/stitch/설정페이지/*는 다른 Stitch 배치와 달리 카드 없이 페이지 배경 위에 내용이
    // 바로 놓이고(premium-card 없음), 좌측 세로 메뉴가 아니라 제목 아래 가로 탭 + 밑줄로
    // 메뉴를 표현한다. code.html보다 screen.png(가로 탭)를 기준으로 그대로 재현했다.
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[960px] px-6 pb-6 pt-14 font-[family-name:var(--font-dm-sans)] tracking-[-0.025em] text-[var(--color-settings-ink)]">
        <h1 className="mb-1.5 text-[36px] font-[400] leading-[1.2] tracking-tight text-[var(--color-settings-ink)]">
          {t("settings.title")}
        </h1>
        <p className="text-[16px] text-[var(--color-settings-secondary)]">
          {t("settings.description")}
        </p>

        <nav className="mt-6 flex gap-8 overflow-x-auto border-b border-stitch-border">
          {TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={
                "shrink-0 pb-4 text-[14px] transition-colors duration-150 " +
                (activeTab === key
                  ? "border-b-2 border-[var(--color-settings-ink)] font-medium text-[var(--color-settings-ink)]"
                  : "text-[var(--color-settings-secondary)] hover:text-[var(--color-settings-ink)]")
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>

        <div className="mt-8 max-w-2xl">
          {activeTab === "profile" && (
            <section>
              <h2 className="text-[16px] font-medium text-[var(--color-settings-ink)]">
                {t("settings.profile.title")}
              </h2>
              <p className="mb-6 mt-1 text-[13px] text-[var(--color-settings-secondary)]">
                {t("settings.profile.description")}
              </p>

              {loading ? (
                <LoadingState>{t("common.loading")}</LoadingState>
              ) : (
                // docs/stitch/설정페이지/jobcal_settings_profile_sophisticated_refresh 기준.
                // 공용 Input/Button은 rounded-lg + 파랑 계열이라 이 화면의 rounded-full 필(pill) +
                // 라벤더 버튼과 크게 달라, 전역 컴포넌트를 건드리지 않고 이 탭 안에서만 순수
                // input/button 마크업으로 새로 그린다(로직은 그대로 재사용).
                <div className="max-w-md space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-profile-name"
                      className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                    >
                      {t("settings.profile.displayName")}
                    </label>
                    <input
                      id="settings-profile-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                      className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] outline-none transition-all hover:border-neutral-400 focus:border-primary-navy focus:ring-2 focus:ring-[#dbeafe]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-profile-email"
                      className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                    >
                      {t("settings.profile.email")}
                    </label>
                    <input
                      id="settings-profile-email"
                      type="email"
                      value={email}
                      disabled
                      className="w-full cursor-not-allowed rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] opacity-70 outline-none"
                    />
                    {/* Stitch에는 이 안내문이 없지만(disabled 상태만으로 표현), 왜 수정할 수
                        없는지 설명하는 기존 UX를 없애지는 않고 기본 화면에서만 숨긴다. */}
                    {SHOW_EMAIL_HINT && (
                      <p className="ml-1 text-[11px] text-[var(--color-settings-secondary)]">
                        {t("settings.profile.emailHint")}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={
                        isSaving || !displayName.trim() || displayName.trim() === initialName
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#e2dffe] px-6 py-3 text-[13px] font-medium text-[#1a192f] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving && (
                        <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                      )}
                      {isSaving ? t("common.loading") : t("common.save")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "account" && (
            <section>
              <div className="mb-10">
                <h2 className="mb-1 text-[16px] font-medium text-[var(--color-settings-ink)]">
                  {t("settings.account.title")}
                </h2>
                <p className="mb-6 text-[13px] text-[var(--color-settings-secondary)]">
                  {t("settings.account.description")}
                </p>

                {/* docs/stitch/설정페이지/jobcal_settings_account_sophisticated_refresh 기준.
                    프로필 탭과 동일한 이유로 공용 Input/Button 대신 이 탭 전용 마크업을 쓴다
                    (rounded-full 필 + 우측 눈 아이콘 토글). 새 비밀번호/확인 로직은 기존
                    handleChangePassword를 그대로 재사용한다. */}
                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-account-current-password"
                      className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                    >
                      {t("settings.account.currentPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="settings-account-current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t("settings.account.currentPasswordPlaceholder")}
                        className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] outline-none transition-all placeholder:text-[var(--color-settings-secondary)] hover:border-neutral-400 focus:border-primary-navy focus:ring-2 focus:ring-[#dbeafe]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={
                          showCurrentPassword ? t("common.hidePassword") : t("common.showPassword")
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-settings-secondary)] hover:text-[var(--color-settings-ink)]"
                      >
                        <MaterialIcon name={showCurrentPassword ? "visibility_off" : "visibility"} size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-account-new-password"
                      className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                    >
                      {t("settings.account.newPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="settings-account-new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("settings.account.newPasswordPlaceholder")}
                        className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] outline-none transition-all placeholder:text-[var(--color-settings-secondary)] hover:border-neutral-400 focus:border-primary-navy focus:ring-2 focus:ring-[#dbeafe]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={
                          showNewPassword ? t("common.hidePassword") : t("common.showPassword")
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-settings-secondary)] hover:text-[var(--color-settings-ink)]"
                      >
                        <MaterialIcon name={showNewPassword ? "visibility_off" : "visibility"} size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="settings-account-confirm-password"
                      className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                    >
                      {t("settings.account.confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="settings-account-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("settings.account.confirmPasswordPlaceholder")}
                        className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] outline-none transition-all placeholder:text-[var(--color-settings-secondary)] hover:border-neutral-400 focus:border-primary-navy focus:ring-2 focus:ring-[#dbeafe]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={
                          showConfirmPassword ? t("common.hidePassword") : t("common.showPassword")
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-settings-secondary)] hover:text-[var(--color-settings-ink)]"
                      >
                        <MaterialIcon name={showConfirmPassword ? "visibility_off" : "visibility"} size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#e2dffe] px-6 py-3 text-[13px] font-medium text-[#1a192f] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isChangingPassword && (
                        <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                      )}
                      {isChangingPassword ? t("common.loading") : t("settings.account.submit")}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t border-stitch-border pt-8">
                <div className="mb-5">
                  <h2 className="mb-1 text-[16px] font-medium text-[var(--color-settings-ink)]">
                    {t("settings.account.deleteSection.title")}
                  </h2>
                  <p className="text-[13px] text-[var(--color-settings-secondary)]">
                    {t("settings.account.deleteSection.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccountClick}
                  className="rounded-full border border-error/10 bg-error/10 px-6 py-3 text-[13px] font-medium text-error shadow-sm transition-colors hover:bg-error/20"
                >
                  {t("settings.account.deleteSection.button")}
                </button>
              </div>
            </section>
          )}

          {activeTab === "plan" && (
            <section>
              <h2 className="mb-1 text-[16px] font-medium text-[var(--color-settings-ink)]">
                {t("settings.plan.title")}
              </h2>
              <p className="mb-6 text-[13px] text-[var(--color-settings-secondary)]">
                {t("settings.plan.description")}
              </p>

              {/* 이 화면에 대한 docs/design-references PNG가 아직 없어(신규 기능), profile/account
                  탭과 동일한 rounded-full 필 + 라벤더(#e2dffe/#1a192f) 언어를 그대로 재사용해
                  새 디자인을 만들지 않고 기존 언어에 맞춘다. */}
              {subscription === null ? (
                <LoadingState>{t("common.loading")}</LoadingState>
              ) : subscription.plan === "pro" ? (
                <div className="max-w-md rounded-2xl border border-neutral-300 bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[16px] font-medium text-[var(--color-settings-ink)]">
                      {t("settings.plan.proName")}
                    </span>
                    {subscription.scheduledChange?.action === "cancel" ? (
                      <Badge variant="warning">{t("settings.plan.cancelScheduledBadge")}</Badge>
                    ) : subscription.status === "past_due" ? (
                      <Badge variant="warning">{t("settings.plan.pastDueBadge")}</Badge>
                    ) : (
                      <Badge variant="success">{t("settings.plan.activeBadge")}</Badge>
                    )}
                  </div>

                  <p className="mt-2 text-[13px] text-[var(--color-settings-secondary)]">
                    {subscription.scheduledChange?.action === "cancel"
                      ? t("settings.plan.cancelScheduledDescription", {
                          date: dateKeyOf(subscription.scheduledChange.effectiveAt),
                        })
                      : subscription.status === "past_due"
                        ? t("settings.plan.pastDueDescription")
                        : t("settings.plan.proActiveDescription")}
                  </p>

                  <button
                    type="button"
                    onClick={handleManageSubscriptionClick}
                    disabled={isPortalLoading}
                    className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white px-6 py-3 text-[13px] font-medium text-[var(--color-settings-ink)] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPortalLoading && (
                      <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                    )}
                    {isPortalLoading ? t("settings.plan.portalLoading") : t("settings.plan.manageButton")}
                  </button>
                </div>
              ) : (
                <div className="max-w-md rounded-2xl border border-neutral-300 bg-white p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-medium text-[var(--color-settings-ink)]">
                      {t("settings.plan.proName")}
                    </span>
                    <span className="text-[15px] font-medium text-[var(--color-settings-ink)]">
                      {t("settings.plan.priceLabel")}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--color-settings-secondary)]">
                    {t("settings.plan.proDescription")}
                  </p>

                  {/* Paddle Checkout(결제 오버레이) 진입 전, 자동갱신/무료체험 없음/해지
                      조건을 JobCal 사이트 자체에서 명확히 고지한다 — Paddle Seller Handbook의
                      "구매 전 정기결제 여부를 매우 명확히 알릴 것" 요구사항과, 特定商取引法
                      최종확인화면 취지(신청 확정 직전 계약조건을 간단히 확인 가능해야 함)를
                      반영한 것. 세 조건(자동갱신/무료체험 없음/해지 가능)을 한 줄 요약으로
                      묶고, 해지 효력 발생 시점처럼 부가적인 설명만 더 작은 텍스트로 분리해
                      카드가 고지문 나열로 보이지 않게 한다 — 고지 내용 자체는 삭제하지 않고
                      전부 화면에 남아있다. */}
                  <p className="mt-3 text-[12px] leading-[1.6] text-[var(--color-settings-secondary)]">
                    {t("settings.plan.noticeSummary")}
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.6] text-[var(--color-settings-secondary)]">
                    {t("settings.plan.noticeCancelDetail")}
                  </p>

                  <button
                    type="button"
                    onClick={openCheckout}
                    disabled={isCheckoutBusy || !isPaddleReady || !userId}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#e2dffe] px-6 py-3 text-[13px] font-medium text-[#1a192f] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCheckoutBusy && (
                      <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                    )}
                    {isCheckoutBusy ? t("settings.plan.upgrading") : t("settings.plan.upgradeButton")}
                  </button>

                  {/* 체크박스가 아니라 문구+링크로 처리한 이유: 特定商取引法(2022년 개정)도
                      Paddle Seller Handbook도 "구매 전 계약조건을 간단히 확인 가능하게 표시"
                      만 요구할 뿐, 별도 체크박스 UI를 명시적으로 요구하지 않는다(배너·링크
                      방식도 허용됨을 확인). 동의 안내는 가장 옅은 muted 텍스트로, 그 아래
                      실제 링크 3개는 밑줄 + 잉크 색으로 대비를 줘서 "읽는 문장"과 "누를 수
                      있는 링크"가 시각적으로 분리되게 한다. 세 번째 링크는 Paddle 공식
                      환불정책 외부 링크가 아니라 JobCal 자체 /refund-policy 페이지로
                      바꿨다 — 그 페이지 안에서 다시 Paddle 공식 환불정책/구매자 약관으로
                      연결되므로, 여기서 두 링크를 동시에 노출해 혼란을 주지 않는다. */}
                  <p className="mt-3 text-[10px] leading-[1.5] text-[var(--color-settings-secondary)]">
                    {t("settings.plan.agreementNotice")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-[1.5]">
                    <Link
                      href="/terms"
                      className="text-[var(--color-settings-ink)] underline underline-offset-2 hover:opacity-70"
                    >
                      {t("settings.plan.termsLinkText")}
                    </Link>
                    <span className="text-[var(--color-settings-secondary)]">・</span>
                    <Link
                      href="/refund-policy"
                      className="text-[var(--color-settings-ink)] underline underline-offset-2 hover:opacity-70"
                    >
                      {t("settings.plan.refundPolicyLinkText")}
                    </Link>
                    <span className="text-[var(--color-settings-secondary)]">・</span>
                    <Link
                      href="/tokushoho"
                      className="text-[var(--color-settings-ink)] underline underline-offset-2 hover:opacity-70"
                    >
                      {t("settings.plan.tokushohoLinkText")}
                    </Link>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "language" && (
            <section>
              <h2 className="mb-1 text-[16px] font-medium text-[var(--color-settings-ink)]">
                {t("settings.language")}
              </h2>
              <p className="mb-6 text-[13px] text-[var(--color-settings-secondary)]">
                {t("settings.languageDescription")}
              </p>

              {/* docs/stitch/설정페이지/jobcal_settings_language_sophisticated_refresh 기준.
                  드롭다운은 pending 선택값만 바꾸고, 실제 전환/저장(LocaleContext.setLocale,
                  localStorage+Supabase 반영)은 "変更を保存"를 눌러야 일어난다. */}
              <div className="max-w-md space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="settings-language-select"
                    className="ml-1 text-[12px] text-[var(--color-settings-secondary)]"
                  >
                    {t("settings.languageLabel")}
                  </label>
                  <div className="relative">
                    <select
                      id="settings-language-select"
                      value={pendingLocale}
                      onChange={(e) => setPendingLocale(e.target.value as Locale)}
                      className="w-full appearance-none rounded-full border border-neutral-300 bg-white px-5 py-3 text-[13px] text-[var(--color-settings-ink)] outline-none transition-all hover:border-neutral-400 focus:border-primary-navy focus:ring-2 focus:ring-[#dbeafe]"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-settings-secondary)]">
                      <MaterialIcon name="expand_more" size={18} />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveLanguage}
                    disabled={pendingLocale === locale}
                    className="rounded-full bg-[#e2dffe] px-6 py-3 text-[13px] font-medium text-[#1a192f] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("settings.account.deleteSection.confirmTitle")}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
      />
    </div>
  );
}
