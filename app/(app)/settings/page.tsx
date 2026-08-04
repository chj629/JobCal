"use client";

import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

const LANGUAGE_OPTIONS: Array<{ value: Locale; labelKey: string }> = [
  { value: "ja", labelKey: "settings.japanese" },
  { value: "ko", labelKey: "settings.korean" },
];

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <h1 className="text-[24px] font-bold text-foreground">{t("settings.title")}</h1>

      <section className="mt-6 rounded-[10px] border border-border bg-card p-6">
        <h2 className="text-[16px] font-semibold text-foreground">{t("settings.language")}</h2>
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
    </div>
  );
}
