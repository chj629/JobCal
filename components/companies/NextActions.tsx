"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InlineEditField from "@/components/companies/InlineEditField";
import { useNextActions } from "@/lib/next-actions-context";
import type { NextAction } from "@/lib/nextActions";
import { useT } from "@/lib/locale-context";

interface NextActionsProps {
  companyId: string;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "次のアクション" 카드.
// next_actions 테이블에 저장한다. text는 InlineEditField로, dueLabel은 항목 아래 보조
// 텍스트로 표시하고(비어 있으면 숨김) 추가 시에만 함께 입력한다.
export default function NextActions({ companyId }: NextActionsProps) {
  const t = useT();
  const { actions, addAction, updateAction, toggleAction, deleteAction } = useNextActions();
  const items = actions.filter((action) => action.companyId === companyId);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [dueLabelDraft, setDueLabelDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NextAction | null>(null);

  function toggle(id: string, done: boolean) {
    toggleAction(id, !done);
  }

  function addItem() {
    if (!draft.trim()) {
      setIsAdding(false);
      setDraft("");
      setDueLabelDraft("");
      return;
    }
    addAction(companyId, draft.trim(), dueLabelDraft);
    setDraft("");
    setDueLabelDraft("");
    setIsAdding(false);
  }

  function cancelAdd() {
    setDraft("");
    setDueLabelDraft("");
    setIsAdding(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteAction(deleteTarget.id);
    setDeleteTarget(null);
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
          <div
            key={item.id}
            className="group -mx-2 flex items-start gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id, item.done)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-stitch-border text-primary-navy focus:ring-0 focus:ring-offset-0"
            />
            <div className={"min-w-0 flex-1" + (item.done ? " opacity-60" : "")}>
              <InlineEditField
                value={item.text}
                onSave={(value) => updateAction(item.id, { text: value })}
                emptyLabel={t("companies.detail.nextActions.placeholder")}
                renderDisplay={(value) => (
                  <span className={item.done ? "line-through" : undefined}>{value}</span>
                )}
              />
              {item.dueLabel && (
                <p className="mt-0.5 text-[11px] text-secondary">{item.dueLabel}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDeleteTarget(item)}
              aria-label={t("common.delete")}
              className="mt-0.5 shrink-0 rounded-stitch-md p-1 text-secondary opacity-100 transition-opacity hover:text-error md:opacity-0 md:group-hover:opacity-100"
            >
              <MaterialIcon name="delete" size={14} />
            </button>
          </div>
        ))}

        {isAdding && (
          <div className="-mx-2 flex flex-col gap-2 px-2">
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={t("companies.detail.nextActions.placeholder")}
              className="w-full rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
            />
            <input
              type="text"
              value={dueLabelDraft}
              onChange={(e) => setDueLabelDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={t("companies.detail.nextActions.dueLabelPlaceholder")}
              className="w-full rounded-stitch-md border border-stitch-border bg-white px-2 py-1 text-[11px] text-stitch-ink outline-none focus:border-primary-navy"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={cancelAdd}
                className="rounded px-2 py-0.5 text-[11px] text-secondary transition-colors hover:bg-black/[0.02]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={addItem}
                className="rounded bg-primary-navy px-2 py-0.5 text-[11px] text-white transition-opacity hover:opacity-90"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("companies.detail.nextActions.deleteConfirm", { text: deleteTarget?.text ?? "" })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
