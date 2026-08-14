"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCompanies } from "@/lib/companies-context";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface CompanyMatchPickerProps {
  suggestedName: string | null;
  onBack: () => void;
  onSelectNew: () => void;
  onSelectExisting: (company: Company) => void;
  // EmailPasteForm과 동일한 목적 — 제공되면 footer 버튼을 Drawer의 고정 footer로 portal.
  footerContainer?: HTMLDivElement | null;
}

type Selection = { type: "existing"; company: Company } | { type: "new" };

// docs/stitch/AI Drawer/jobcal_dashboard_ai_drawer_step_2_refined_saas_style의 "企業を確認"
// 화면. Stitch는 AI가 자동으로 일치하는 기존 기업 하나를 찾아 라디오로 미리 보여주는데,
// 실제 자동 매칭 백엔드는 없으므로 이미 불러온 companies 목록에서 추출된 이름과 정확히
// 일치하는 기업을 찾아 같은 방식으로 보여준다(기존 데이터 재사용, 새 API 없음). 라디오
// 선택 자체는 즉시 다음 단계로 넘어가지 않고 "次へ"를 눌러야 확정된다(기존엔 클릭 즉시
// 전환됐음). 시안에 없는 "기존 기업 직접 검색" 기능은 접힌 링크 뒤에 그대로 남겨뒀다.
export default function CompanyMatchPicker({
  suggestedName,
  onBack,
  onSelectNew,
  onSelectExisting,
  footerContainer,
}: CompanyMatchPickerProps) {
  const t = useT();
  const { companies } = useCompanies();

  const exactMatch = useMemo(() => {
    const normalized = suggestedName?.trim().toLowerCase();
    if (!normalized) return null;
    return companies.find((company) => company.name.trim().toLowerCase() === normalized) ?? null;
  }, [companies, suggestedName]);

  const [selection, setSelection] = useState<Selection>(() =>
    exactMatch ? { type: "existing", company: exactMatch } : { type: "new" }
  );
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState(suggestedName ?? "");

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, search]);

  function handleNext() {
    if (selection.type === "existing") {
      onSelectExisting(selection.company);
    } else {
      onSelectNew();
    }
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex-1 rounded-full border border-stitch-border py-4 text-[14px] font-[500] text-stitch-ink transition-all hover:bg-stitch-bg"
      >
        {t("aiEmail.match.back")}
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="flex-[2] rounded-full bg-primary-navy py-4 text-[14px] font-[500] text-white transition-all hover:opacity-90"
      >
        {t("aiEmail.match.next")}
      </button>
    </>
  );

  return (
    <div className={footerContainer ? "" : "flex h-full flex-col"}>
      <h3 className="mb-8 text-[24px] font-[500] tracking-tight text-stitch-ink">
        {t("aiEmail.match.title")}
      </h3>

      <div className={footerContainer ? "space-y-8" : "flex-1 space-y-8"}>
        <div className="rounded-stitch-2xl bg-stitch-bg p-6">
          <p className="mb-1 text-[12px] text-secondary">{t("aiEmail.match.extractedLabel")}</p>
          <p className="text-[20px] font-[500] text-stitch-ink">
            {suggestedName || t("aiEmail.match.title")}
          </p>
        </div>

        <div className="space-y-4">
          <p className="px-2 text-[12px] font-[500] text-stitch-ink">
            {t("aiEmail.match.selectMethodLabel")}
          </p>

          {exactMatch && (
            <label
              className={
                "group flex cursor-pointer items-center gap-4 rounded-stitch-2xl border p-5 transition-all hover:bg-stitch-bg " +
                (selection.type === "existing"
                  ? "border-primary-navy/40 bg-stitch-bg"
                  : "border-stitch-border bg-white")
              }
            >
              <input
                type="radio"
                name="company-select"
                checked={selection.type === "existing"}
                onChange={() => setSelection({ type: "existing", company: exactMatch })}
                className="h-5 w-5 border-stitch-border text-primary-navy focus:ring-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-[500] text-stitch-ink">
                    {exactMatch.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-primary-navy/10 px-2 py-0.5 text-[10px] font-[500] text-primary-navy">
                    {t("aiEmail.match.registered")}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-secondary">{t("aiEmail.match.matchedHint")}</p>
              </div>
            </label>
          )}

          <label
            className={
              "flex cursor-pointer items-center gap-4 rounded-stitch-2xl border p-5 transition-all hover:bg-stitch-bg " +
              (selection.type === "new"
                ? "border-primary-navy/40 bg-stitch-bg"
                : "border-stitch-border bg-white")
            }
          >
            <input
              type="radio"
              name="company-select"
              checked={selection.type === "new"}
              onChange={() => setSelection({ type: "new" })}
              className="h-5 w-5 border-stitch-border text-primary-navy focus:ring-0"
            />
            <p className="text-[15px] font-[500] text-stitch-ink">{t("aiEmail.match.createNew")}</p>
          </label>

          {/* Stitch screen.png에는 없는 기존 "기업 직접 검색" 기능. 지우지 않고 접어서 둔다. */}
          {!showSearch ? (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-2 text-[12px] text-secondary underline-offset-2 hover:text-stitch-ink hover:underline"
            >
              {t("aiEmail.match.searchOthers")}
            </button>
          ) : (
            <div className="rounded-stitch-2xl border border-stitch-border bg-white p-5">
              <label className="mb-1.5 block px-1 text-[12px] text-secondary">
                {t("aiEmail.match.searchLabel")}
              </label>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("companies.list.searchPlaceholder")}
                  className="w-full rounded-full border border-stitch-border bg-stitch-bg py-2.5 pl-10 pr-4 text-[13px] text-stitch-ink outline-none focus:border-primary-navy"
                />
              </div>

              {search.trim() && (
                <div className="mt-3 flex flex-col gap-2">
                  {matches.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-secondary">
                      {t("aiEmail.match.noMatches")}
                    </p>
                  ) : (
                    matches.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => setSelection({ type: "existing", company })}
                        className={
                          "flex items-center justify-between rounded-stitch-md border px-4 py-2.5 text-left text-[13px] transition-colors " +
                          (selection.type === "existing" && selection.company.id === company.id
                            ? "border-primary-navy text-primary-navy"
                            : "border-stitch-border text-stitch-ink hover:border-primary-navy/40")
                        }
                      >
                        <span className="truncate font-[500]">{company.name}</span>
                        <span className="shrink-0 text-[11px] text-primary-navy">
                          {t("aiEmail.match.selectButton")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {footerContainer ? (
        // footerContainer가 이미 "flex gap-3" 행이므로 또 감싸지 않는다(중첩 시 안쪽 div가
        // flex-grow 없이 내용 크기로만 축소되어 버튼이 좁아지는 문제가 있었다).
        createPortal(footer, footerContainer)
      ) : (
        <div className="mt-auto flex gap-3 pt-8">{footer}</div>
      )}
    </div>
  );
}
