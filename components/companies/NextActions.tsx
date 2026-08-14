"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useT } from "@/lib/locale-context";

interface ActionItem {
  id: string;
  text: string;
  dueLabel: string;
  done: boolean;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "次のアクション" 카드.
// 마감일이 있는 자유 형식 할일 목록은 현재 스키마(supabase/migrations)에 대응하는 테이블이
// 없다(task_completions 테이블은 있지만 어떤 코드에서도 쓰이지 않는 예전 설계의 흔적이라
// 재사용하지 않았다). 그래서 로컬 state로만 UI를 구현하고, 새로고침하면 초기화된다.
export default function NextActions() {
  const t = useT();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function toggle(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function addItem() {
    if (!draft.trim()) {
      setIsAdding(false);
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: draft.trim(), dueLabel: "", done: false },
    ]);
    setDraft("");
    setIsAdding(false);
  }

  return (
    <div className="rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="check_circle" size={17} className="text-secondary" />
          {t("companies.detail.nextActions.title")}
        </h3>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-0.5 rounded-stitch-md px-2 py-1 text-[11px] font-[400] text-primary-navy transition-colors hover:bg-black/[0.02]"
        >
          <MaterialIcon name="add" size={14} />
          {t("common.add")}
        </button>
      </div>

      {items.length === 0 && !isAdding && (
        <p className="text-[13px] text-secondary">{t("companies.detail.nextActions.empty")}</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="-mx-2 flex cursor-pointer items-start gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-stitch-border text-primary-navy focus:ring-0 focus:ring-offset-0"
            />
            <span
              className={
                "text-[13px] font-[400] leading-tight " +
                (item.done ? "text-secondary line-through" : "text-stitch-ink")
              }
            >
              {item.text}
            </span>
          </label>
        ))}

        {isAdding && (
          <div className="-mx-2 flex items-center gap-2 px-2">
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              onBlur={addItem}
              placeholder={t("companies.detail.nextActions.placeholder")}
              className="w-full rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
