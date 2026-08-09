"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useT } from "@/lib/locale-context";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  containerClassName?: string;
  // 1_login.png~5_authmobile.png 기준 입력창 좌측 아이콘(메일/자물쇠/사용자). 아이콘이 없으면
  // 기존과 동일하게 렌더링된다.
  icon?: LucideIcon;
}

// 36_inputs.png 기준: label + input + (error 또는 hint) 구조. Focused/Error 상태만 색상으로 구분한다.
// type="password"일 때는 시안(1_login.png 등)처럼 우측에 표시/숨김(Eye) 토글을 자동으로 붙인다.
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    id,
    className = "",
    containerClassName = "",
    icon: Icon,
    type,
    disabled,
    ...props
  },
  ref
) {
  const t = useT();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className={
              "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" +
              (disabled ? " opacity-60" : "")
            }
          />
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword ? (visible ? "text" : "password") : type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            "h-10 w-full rounded-lg border bg-card text-sm text-foreground placeholder:text-secondary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 " +
            (Icon ? "pl-9 " : "pl-3 ") +
            (isPassword ? "pr-9 " : "pr-3 ") +
            (error ? "border-error focus:border-error" : "border-border focus:border-primary") +
            (className ? " " + className : "")
          }
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            disabled={disabled}
            aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1 text-xs text-secondary">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export default Input;
