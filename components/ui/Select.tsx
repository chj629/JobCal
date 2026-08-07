"use client";

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

// 36_inputs.png "8. Select" 기준: label + select(+ chevron 아이콘) + (error 또는 hint) 구조.
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = "", containerClassName = "", children, ...props },
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            "h-10 w-full appearance-none rounded-lg border bg-card px-3 pr-9 text-sm text-foreground focus:outline-none " +
            (error ? "border-error focus:border-error" : "border-border focus:border-primary") +
            (className ? " " + className : "")
          }
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
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
