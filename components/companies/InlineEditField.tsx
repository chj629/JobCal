"use client";

import { useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/locale-context";

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "textarea";
  emptyLabel: string;
  renderDisplay?: (value: string) => ReactNode;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "企業情報"/"マイページ情報"
// 카드가 반복해서 쓰는 "텍스트 클릭 → 인라인 입력" 패턴. 실제 저장 여부(Supabase 연결 여부)는
// 이 컴포넌트가 신경 쓰지 않고 onSave 호출부에서 결정한다(자세한 건 사용하는 쪽 참고). 저장
// 방식은 타입별로 다르다: 한 줄(text)은 버튼 없이 blur/Enter로 저장, Escape로 취소한다
// (기업명/전형명/일시 등 페이지의 다른 한 줄 필드들과 같은 규칙). 여러 줄(textarea)은 Enter가
// 줄바꿈이라 저장 신호로 못 써서 기존 저장/취소 버튼을 그대로 둔다.
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
  // Escape로 닫을 때 React가 입력을 언마운트하면서 브라우저가 별도로 blur를 발생시킬 수 있어,
  // 그 blur가 onSave를 한 번 더 부르지 않도록 "이번 blur는 무시" 표시만 남겨둔다.
  const skipBlurSaveRef = useRef(false);

  function startEditing() {
    skipBlurSaveRef.current = false;
    setDraft(value);
    setIsEditing(true);
  }

  if (isEditing) {
    if (type === "textarea") {
      return (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[60px] resize-none rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded px-2 py-0.5 text-[11px] text-secondary transition-colors hover:bg-black/[0.02]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                setIsEditing(false);
              }}
              className="rounded bg-primary-navy px-2 py-0.5 text-[11px] text-white transition-opacity hover:opacity-90"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlurSaveRef.current) {
            skipBlurSaveRef.current = false;
            setIsEditing(false);
            return;
          }
          onSave(draft);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // blur를 유도해 저장 경로(onBlur)를 한 번만 타게 한다 — 여기서 직접 onSave를
            // 부르면 이어지는 blur가 다시 onSave를 불러 저장이 두 번 될 수 있다.
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            skipBlurSaveRef.current = true;
            setIsEditing(false);
          }
        }}
        className="w-full rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className="-mx-1.5 -my-0.5 block cursor-pointer whitespace-pre-wrap rounded-stitch-md border border-transparent bg-[#f8f9ff] px-1.5 py-0.5 text-[13px] text-stitch-ink transition-colors hover:border-stitch-border"
    >
      {value ? renderDisplay ? renderDisplay(value) : value : <span className="text-secondary">{emptyLabel}</span>}
    </span>
  );
}
