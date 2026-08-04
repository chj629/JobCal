"use client";

import { useState } from "react";

interface EmailPasteFormProps {
  onAnalyze: (emailText: string) => void;
  loading: boolean;
  error: string | null;
}

export default function EmailPasteForm({ onAnalyze, loading, error }: EmailPasteFormProps) {
  const [emailText, setEmailText] = useState("");

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <h1 className="text-[20px] font-semibold text-foreground">메일로 기업 추가</h1>
      <p className="mt-1 text-sm text-secondary">
        채용 관련 이메일 원문을 붙여넣으면 AI가 기업명, 전형 단계, 일정, 담당자 등을 추출합니다.
      </p>

      <div className="mt-6 rounded-[10px] border border-border bg-card p-6">
        <label className="mb-1 block text-sm text-secondary">이메일 원문</label>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          rows={14}
          placeholder="이메일 내용을 붙여넣어 주세요."
          className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-error">{error}</p>}

        <button
          type="button"
          disabled={loading || !emailText.trim()}
          onClick={() => onAnalyze(emailText)}
          className="mt-4 h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "분석 중..." : "AI로 분석하기"}
        </button>
      </div>
    </div>
  );
}
