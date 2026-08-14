"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useT } from "@/lib/locale-context";

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "選考メモ" 카드.
// 전형(step)이나 기업 어디에도 이런 메모를 저장할 컬럼이 없어(선고 자체 메모는 신규 개념),
// 우선 UI만 구현한다. 로컬 state만 쓰고 저장하지 않으므로 새로고침하면 초기화된다.
export default function SelectionMemo() {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="notes" size={17} className="text-secondary" />
          {t("companies.detail.selectionMemo.title")}
        </h2>
        {/* isEditing이어도 버튼을 DOM에서 없애지 않고 invisible로만 감춘다. 조건부 렌더로
            없애면 이 flex 행의 높이가 바뀌어(버튼이 h2보다 padding 때문에 더 높음) 제목
            줄 위치가 편집 모드 전환 시 미세하게 움직이는 문제가 있었다. */}
        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setIsEditing(true);
          }}
          className={
            "flex items-center gap-0.5 rounded-stitch-md px-2 py-1 text-[11px] font-[400] text-primary-navy transition-colors hover:bg-black/[0.02] " +
            (isEditing ? "invisible" : "")
          }
        >
          <MaterialIcon name="add" size={14} />
          {t("common.add")}
        </button>
      </div>

      <div className="pl-6">
        {isEditing ? (
          // 표시 모드 박스(border + p-4)와 정확히 같은 여백이어야 텍스트 시작 위치가
          // 편집 모드 전환 전후로 안 움직인다(border 두께는 이미 양쪽 다 1px로 같음).
          <div className="rounded-stitch-md border border-primary-navy bg-white p-4">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mb-2 min-h-[100px] w-full resize-none border-none bg-transparent p-0 text-[13px] leading-relaxed text-stitch-ink outline-none focus:ring-0"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-stitch-md px-3 py-1 text-[11px] text-secondary transition-colors hover:bg-black/[0.02]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaved(draft);
                  setIsEditing(false);
                }}
                className="rounded-stitch-md bg-primary-navy px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-90"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              setDraft(saved);
              setIsEditing(true);
            }}
            className="min-h-[60px] cursor-pointer whitespace-pre-wrap rounded-stitch-xl border border-transparent bg-[#f8f9ff] p-4 text-[13px] leading-relaxed text-stitch-ink transition-colors hover:border-stitch-border"
          >
            {saved || (
              <span className="text-secondary">{t("companies.detail.selectionMemo.empty")}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
