"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/lib/locale-context";

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "password" | "textarea";
  emptyLabel: string;
  renderDisplay?: (value: string) => ReactNode;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "企業情報"/"マイページ情報"
// 카드가 반복해서 쓰는 "텍스트 클릭 → 인라인 입력 → 저장/취소" 패턴. 실제 저장 여부(Supabase 연결
// 여부)는 이 컴포넌트가 신경 쓰지 않고 onSave 호출부에서 결정한다(자세한 건 사용하는 쪽 참고).
export default function InlineEditField({
  value,
  onSave,
  type = "text",
  emptyLabel,
  renderDisplay,
}: InlineEditFieldProps) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [showPassword, setShowPassword] = useState(false);

  if (isEditing) {
    const InputTag = type === "textarea" ? "textarea" : "input";
    return (
      <div className="flex flex-col gap-2">
        <InputTag
          autoFocus
          type={type === "textarea" ? undefined : type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={
            "w-full rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[12px] text-stitch-ink outline-none " +
            (type === "textarea" ? "min-h-[60px] resize-none" : "")
          }
        />
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded px-2 py-0.5 text-[10px] text-secondary transition-colors hover:bg-black/[0.02]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              setIsEditing(false);
            }}
            className="rounded bg-primary-navy px-2 py-0.5 text-[10px] text-white transition-opacity hover:opacity-90"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    );
  }

  if (type === "password") {
    return (
      <div className="flex items-center gap-2">
        <span
          onClick={() => {
            setDraft(value);
            setIsEditing(true);
          }}
          className="cursor-pointer text-[12px] text-stitch-ink hover:underline"
        >
          {value ? (showPassword ? value : "•".repeat(Math.min(value.length, 12))) : emptyLabel}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-stitch-md text-secondary transition-colors hover:bg-black/[0.02] hover:text-stitch-ink"
            aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
          >
            <span className="material-symbols-outlined text-[14px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(value);
        setIsEditing(true);
      }}
      className="block cursor-pointer whitespace-pre-wrap text-[12px] text-stitch-ink hover:underline"
    >
      {value ? renderDisplay ? renderDisplay(value) : value : <span className="text-secondary">{emptyLabel}</span>}
    </span>
  );
}
