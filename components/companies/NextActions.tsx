"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useNextActions } from "@/lib/next-actions-context";
import { useT } from "@/lib/locale-context";

interface NextActionsProps {
  companyId: string;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "次のアクション" 카드.
// next_actions 테이블에 저장한다. dueLabel은 현재 UI에서 표시/입력하지 않는다.
export default function NextActions({ companyId }: NextActionsProps) {
  const t = useT();
  const { actions, addAction, toggleAction } = useNextActions();
  const items = actions.filter((action) => action.companyId === companyId);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function toggle(id: string, done: boolean) {
    toggleAction(id, !done);
  }

  function addItem() {
    if (!draft.trim()) {
      setIsAdding(false);
      return;
    }
    addAction(companyId, draft.trim());
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
              onChange={() => toggle(item.id, item.done)}
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
