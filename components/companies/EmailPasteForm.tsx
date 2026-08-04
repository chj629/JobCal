"use client";

import { useState } from "react";
import { useT } from "@/lib/locale-context";

interface EmailPasteFormProps {
  onAnalyze: (emailText: string) => void;
  loading: boolean;
  error: string | null;
}

export default function EmailPasteForm({ onAnalyze, loading, error }: EmailPasteFormProps) {
  const t = useT();
  const [emailText, setEmailText] = useState("");

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <h1 className="text-[20px] font-semibold text-foreground">{t("aiEmail.paste.title")}</h1>
      <p className="mt-1 text-sm text-secondary">{t("aiEmail.paste.description")}</p>

      <div className="mt-6 rounded-[10px] border border-border bg-card p-6">
        <label className="mb-1 block text-sm text-secondary">{t("aiEmail.paste.label")}</label>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          rows={14}
          placeholder={t("aiEmail.paste.placeholder")}
          className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-error">{error}</p>}

        <button
          type="button"
          disabled={loading || !emailText.trim()}
          onClick={() => onAnalyze(emailText)}
          className="mt-4 h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? t("aiEmail.paste.submitting") : t("aiEmail.paste.submit")}
        </button>
      </div>
    </div>
  );
}
