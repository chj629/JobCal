"use client";

import type { ReactNode } from "react";
import { Building2, CalendarDays, Star } from "lucide-react";
import { useT } from "@/lib/locale-context";
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface AuthLayoutProps {
  children: ReactNode;
}

const FEATURES = [
  {
    icon: Building2,
    titleKey: "auth.branding.feature1Title",
    descriptionKey: "auth.branding.feature1Description",
  },
  {
    icon: CalendarDays,
    titleKey: "auth.branding.feature2Title",
    descriptionKey: "auth.branding.feature2Description",
  },
  {
    icon: Star,
    titleKey: "auth.branding.feature3Title",
    descriptionKey: "auth.branding.feature3Description",
  },
] as const;

// 1_login.png~5_authmobile.png 기준 공용 인증 레이아웃. lg 이상에서는 좌측 브랜딩 패널 +
// 우측 폼 2단 구성, lg 미만에서는 브랜딩 패널을 숨기고 기존처럼 폼 카드만 보여준다.
// 로고는 components/ui/Logo.tsx 공용 컴포넌트를 그대로 재사용한다.
export default function AuthLayout({ children }: AuthLayoutProps) {
  const t = useT();

  return (
    <div className="relative flex min-h-screen bg-background">
      <LanguageSwitcher className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6" />

      <div className="hidden w-1/2 flex-col justify-between px-16 py-16 lg:flex">
        <div>
          <Logo size="lg" />

          <h1 className="mt-12 text-3xl font-bold text-foreground">
            {t("auth.branding.headline")}
          </h1>
          <p className="mt-3 max-w-sm text-sm text-secondary">{t("auth.branding.subtitle")}</p>

          <div className="mt-12 flex flex-col gap-6">
            {FEATURES.map(({ icon: Icon, titleKey, descriptionKey }) => (
              <div key={titleKey} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
                  <p className="mt-0.5 text-sm text-secondary">{t(descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-secondary">{t("auth.branding.copyright")}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">{children}</div>
    </div>
  );
}
