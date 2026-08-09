"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Globe, Lock, User, type LucideIcon } from "lucide-react";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const MIN_PASSWORD_LENGTH = 6;

type SettingsTab = "profile" | "account" | "language";

const TABS: Array<{ key: SettingsTab; labelKey: string; icon: LucideIcon }> = [
  { key: "profile", labelKey: "settings.tabs.profile", icon: User },
  { key: "account", labelKey: "settings.tabs.account", icon: Lock },
  { key: "language", labelKey: "settings.tabs.language", icon: Globe },
];

const LANGUAGE_OPTIONS: Array<{ value: Locale; labelKey: string }> = [
  { value: "ja", labelKey: "settings.japanese" },
  { value: "ko", labelKey: "settings.korean" },
];

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const t = useT();
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
      const name = user?.user_metadata?.display_name;
      const safeName = typeof name === "string" ? name : "";
      setDisplayName(safeName);
      setInitialName(safeName);
      setLoading(false);
    });
  }, []);

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

    if (!newPassword || !confirmPassword) {
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      showToast(t("auth.errors.updateFailed"), "error");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    showToast(t("settings.account.saveSuccess"));
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <h1 className="text-[28px] font-semibold text-foreground">{t("settings.title")}</h1>
      <p className="mt-1 text-sm text-secondary">{t("settings.description")}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 " +
                (activeTab === key
                  ? "bg-primary text-white"
                  : "text-foreground hover:bg-background")
              }
            >
              <Icon size={16} />
              {t(labelKey)}
            </button>
          ))}
        </nav>

        <div>
          {activeTab === "profile" && (
            <section className="rounded-[10px] border border-border bg-card p-6">
              <h2 className="text-[16px] font-semibold text-foreground">
                {t("settings.profile.title")}
              </h2>

              {loading ? (
                <p className="mt-4 text-sm text-secondary">{t("common.loading")}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <Input
                    label={t("settings.profile.displayName")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                  />
                  <Input
                    label={t("settings.profile.email")}
                    value={email}
                    disabled
                    hint={t("settings.profile.emailHint")}
                  />
                  <div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleSaveName}
                      disabled={
                        isSaving || !displayName.trim() || displayName.trim() === initialName
                      }
                    >
                      {isSaving ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "account" && (
            <section className="rounded-[10px] border border-border bg-card p-6">
              <h2 className="text-[16px] font-semibold text-foreground">
                {t("settings.account.title")}
              </h2>
              <p className="mt-1 text-sm text-secondary">{t("settings.account.description")}</p>

              <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
                <Input
                  type="password"
                  icon={Lock}
                  label={t("settings.account.newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  icon={Lock}
                  label={t("settings.account.confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div>
                  <Button type="submit" variant="primary" disabled={isChangingPassword}>
                    {isChangingPassword ? t("common.loading") : t("settings.account.submit")}
                  </Button>
                </div>
              </form>
            </section>
          )}

          {activeTab === "language" && (
            <section className="rounded-[10px] border border-border bg-card p-6">
              <h2 className="text-[16px] font-semibold text-foreground">
                {t("settings.language")}
              </h2>
              <p className="mt-1 text-sm text-secondary">{t("settings.languageDescription")}</p>

              <div className="mt-4 flex gap-2">
                {LANGUAGE_OPTIONS.map((option) => {
                  const isActive = locale === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLocale(option.value)}
                      aria-pressed={isActive}
                      className={
                        "h-10 rounded-[10px] border px-4 text-sm font-medium transition-colors duration-150 " +
                        (isActive
                          ? "border-primary bg-primary text-white"
                          : "border-border text-foreground hover:bg-background")
                      }
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
