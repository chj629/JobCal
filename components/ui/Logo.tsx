"use client";

import { CalendarDays } from "lucide-react";
import { useT } from "@/lib/locale-context";

export type LogoSize = "sm" | "md" | "lg";

export interface LogoProps {
  size?: LogoSize;
  iconOnly?: boolean;
  textClassName?: string;
  className?: string;
}

// 0_logo.png는 아이콘+워드마크+슬로건이 한 장으로 합성된 참고용 이미지라 임의로
// 크롭/재디자인하지 않는다. Sidebar/AuthLayout/Landing에서 각각 따로 그리던
// Lucide CalendarDays 기반 마크를 이 컴포넌트 하나로 공용화만 한다.
const SIZE_STYLES: Record<LogoSize, { box: string; rounded: string; icon: number; text: string }> = {
  sm: { box: "h-7 w-7", rounded: "rounded-md", icon: 16, text: "text-sm" },
  md: { box: "h-8 w-8", rounded: "rounded-lg", icon: 18, text: "text-lg" },
  lg: { box: "h-10 w-10", rounded: "rounded-lg", icon: 22, text: "text-2xl" },
};

export default function Logo({
  size = "md",
  iconOnly = false,
  textClassName = "text-foreground",
  className = "",
}: LogoProps) {
  const t = useT();
  const { box, rounded, icon, text } = SIZE_STYLES[size];

  return (
    <div className={"flex items-center gap-2 " + className}>
      <span
        className={
          "flex shrink-0 items-center justify-center bg-primary text-white " + box + " " + rounded
        }
      >
        <CalendarDays size={icon} />
      </span>
      {!iconOnly && (
        <span className={"font-semibold " + text + " " + textClassName}>
          {t("common.appName")}
        </span>
      )}
    </div>
  );
}
