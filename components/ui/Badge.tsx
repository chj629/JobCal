import type { HTMLAttributes } from "react";

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info"
  // 요청받은 6개 variant 중 어디에도 대응하지 않는 "내정(joined)" 상태 색상(#8B5CF6)을
  // 그대로 보존하기 위한 최소 확장.
  | "purple";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

// 37_badges.png 색상 기준. neutral은 44_designtoken.png의 Muted(#9CA3AF) 토큰을 사용해
// 기존 --color-cancelled와 동일한 색상을 유지한다. info는 44_designtoken.png의 Info(#3B82F6) 토큰을 사용한다.
const VARIANT_CLASS: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-error/10 text-error",
  neutral: "bg-muted/10 text-muted",
  info: "bg-info/10 text-info",
  purple: "bg-joined/10 text-joined",
};

// 37_badges.png "4. Size Variants" 기준: Medium(기본) 22px / 12px, Small 18px / 11px.
const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "px-2 py-0 text-[11px] leading-[18px]",
  md: "px-2.5 py-0.5 text-xs",
};

export default function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full font-medium " +
        SIZE_CLASS[size] +
        " " +
        VARIANT_CLASS[variant] +
        (className ? " " + className : "")
      }
      {...props}
    />
  );
}
