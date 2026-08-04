"use client";

import { useMemo, useState } from "react";
import { useCompanies } from "@/lib/companies-context";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface CompanyMatchPickerProps {
  suggestedName: string | null;
  onSelectNew: () => void;
  onSelectExisting: (company: Company) => void;
}

// 이메일에서 추출한 기업명이 기존에 등록된 기업일 수 있으므로, 자동 연결 없이
// 사용자가 "새 기업으로 등록" 또는 "기존 기업 선택" 중 하나를 직접 고르게 한다.
export default function CompanyMatchPicker({
  suggestedName,
  onSelectNew,
  onSelectExisting,
}: CompanyMatchPickerProps) {
  const t = useT();
  const { companies } = useCompanies();
  const [search, setSearch] = useState(suggestedName ?? "");

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, search]);

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <h1 className="text-[20px] font-semibold text-foreground">{t("aiEmail.match.title")}</h1>
      <p className="mt-1 text-sm text-secondary">
        {suggestedName
          ? t("aiEmail.match.descriptionWithSuggestion", { name: suggestedName })
          : t("aiEmail.match.descriptionNoSuggestion")}
      </p>

      <div className="mt-6 rounded-[10px] border border-border bg-card p-6">
        <label className="mb-1 block text-sm text-secondary">{t("aiEmail.match.searchLabel")}</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("companies.list.searchPlaceholder")}
          className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />

        {search.trim() && (
          <div className="mt-4 flex flex-col gap-2">
            {matches.length === 0 ? (
              <p className="py-4 text-center text-sm text-secondary">{t("aiEmail.match.noMatches")}</p>
            ) : (
              matches.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => onSelectExisting(company)}
                  className="flex items-center justify-between rounded-[10px] border border-border px-4 py-3 text-left text-sm hover:border-primary"
                >
                  <span className="font-medium text-foreground">{company.name}</span>
                  <span className="text-xs text-primary">{t("aiEmail.match.selectButton")}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSelectNew}
        className="mt-4 h-10 w-full rounded-[10px] border border-border bg-card text-sm font-medium text-foreground hover:bg-background"
      >
        {t("aiEmail.match.createNew")}
      </button>
    </div>
  );
}
