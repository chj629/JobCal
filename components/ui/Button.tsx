"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// 35_buttons.png 기준. 시안의 Outline/Success variant는 이번 Step 요구사항(primary/secondary/ghost/danger)에
// 포함되지 않아 추가하지 않는다.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
  secondary: "border border-border bg-card text-foreground hover:bg-background",
  ghost: "text-secondary hover:bg-background hover:text-foreground",
  danger: "bg-error text-white hover:bg-error/90",
};

// 35_buttons.png 기준 사이즈(Large 48 / Medium 40 / Small 32). 기존 화면은 h-10(md)을 사용 중이라 md를 기본값으로 유지한다.
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 " +
        SIZE_CLASS[size] +
        " " +
        VARIANT_CLASS[variant] +
        (className ? " " + className : "")
      }
      {...props}
    />
  );
});

export default Button;
