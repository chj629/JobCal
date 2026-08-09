"use client";

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export type SelectSize = "sm" | "md";

// 네이티브 <select>의 size 속성(보이는 옵션 줄 수를 지정하는 숫자)은 이 프로젝트에서
// 쓰지 않으므로 Omit하고, 같은 이름을 컴포넌트 크기 variant 용도로 재정의한다.
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  containerClassName?: string;
  size?: SelectSize;
}

// md는 기존 스타일(h-10/px-3 pr-9/text-sm) 그대로. sm은 PipelineOverview.tsx가 쓰던
// raw select(h-8/px-2/text-xs)의 컴팩트한 크기를 유지하기 위한 변형이다. 체브론이 들어갈
// 오른쪽 여백만 md의 pr-9 비율을 그대로 줄여 pr-6으로 잡는다.
const SIZE_CLASS: Record<SelectSize, string> = {
  sm: "h-8 px-2 pr-6 text-xs",
  md: "h-10 px-3 pr-9 text-sm",
};

const CHEVRON_SIZE: Record<SelectSize, number> = {
  sm: 14,
  md: 16,
};

const CHEVRON_POSITION_CLASS: Record<SelectSize, string> = {
  sm: "right-2",
  md: "right-3",
};

// 36_inputs.png "8. Select" 기준: label + select(+ chevron 아이콘) + (error 또는 hint) 구조.
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    id,
    className = "",
    containerClassName = "",
    size = "md",
    disabled,
    children,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            "w-full appearance-none rounded-lg border bg-card text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 " +
            SIZE_CLASS[size] +
            " " +
            (error ? "border-error focus:border-error" : "border-border focus:border-primary") +
            (className ? " " + className : "")
          }
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={CHEVRON_SIZE[size]}
          aria-hidden="true"
          className={
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-secondary " +
            CHEVRON_POSITION_CLASS[size] +
            (disabled ? " opacity-60" : "")
          }
        />
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

export default Select;
