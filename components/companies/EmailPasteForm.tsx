"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Flag,
  Layers,
  Link2,
  Loader2,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface EmailPasteFormProps {
  onAnalyze: (emailText: string) => void;
  loading: boolean;
  error: string | null;
}

// 13_AiDrawerEmpty.png 하단 추출 항목 목록과 동일한 순서/아이콘.
const EXTRACT_FIELDS = [
  { icon: Building2, labelKey: "aiEmail.paste.extractFields.company" },
  { icon: Layers, labelKey: "aiEmail.paste.extractFields.step" },
  { icon: Flag, labelKey: "aiEmail.paste.extractFields.result" },
  { icon: Calendar, labelKey: "aiEmail.paste.extractFields.schedule" },
  { icon: User, labelKey: "aiEmail.paste.extractFields.contact" },
  { icon: Link2, labelKey: "aiEmail.paste.extractFields.url" },
  { icon: FileText, labelKey: "aiEmail.paste.extractFields.memo" },
] as const;

// 15__AiDrawerAnalyzing.png 기준. 실제 단계별 진행 상황(체크리스트)은 백엔드에서
// 신호를 주지 않아 흉내낼 수 없으므로, 과장 없이 스피너 + 문구만 보여준다.
export default function EmailPasteForm({ onAnalyze, loading, error }: EmailPasteFormProps) {
  const t = useT();
  const [emailText, setEmailText] = useState("");
  const hasText = emailText.trim().length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 size={28} className="animate-spin" />
        </span>
        <h2 className="mt-2 text-[16px] font-semibold text-foreground">
          {t("aiEmail.paste.analyzingTitle")}
        </h2>
        <p className="text-sm text-secondary">{t("aiEmail.paste.analyzingDescription")}</p>
        <p className="mt-4 text-xs text-secondary">{t("aiEmail.paste.analyzingEstimate")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">{t("aiEmail.paste.title")}</h1>
        <p className="mt-1 text-sm text-secondary">{t("aiEmail.paste.description")}</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[10px] border border-error/40 bg-error/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="text-sm font-medium text-error">{t("aiEmail.paste.errorTitle")}</p>
            <p className="mt-1 text-xs text-error">{error}</p>
          </div>
        </div>
      )}

      {!hasText && (
        <div className="rounded-[10px] border border-border bg-card p-6">
          <EmptyState
            icon={Mail}
            title={t("aiEmail.paste.emptyTitle")}
            description={t("aiEmail.paste.emptyDescription")}
          />
          <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
            {EXTRACT_FIELDS.map(({ icon: Icon, labelKey }) => (
              <li key={labelKey} className="flex items-center gap-2 py-2 text-sm text-secondary">
                <Icon size={16} className="text-primary" />
                {t(labelKey)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {hasText ? (
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-secondary">
              {t("aiEmail.paste.label")}
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 size={14} />
                {t("aiEmail.paste.pastedComplete")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setEmailText("")}
              className="text-xs font-medium text-secondary hover:text-foreground"
            >
              {t("aiEmail.paste.clearText")}
            </button>
          </div>
        ) : (
          <label className="mb-1 block text-sm text-secondary">{t("aiEmail.paste.label")}</label>
        )}
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          rows={hasText ? 12 : 6}
          placeholder={t("aiEmail.paste.placeholder")}
          className={
            "w-full rounded-[10px] border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none " +
            (hasText ? "border-border" : "border-dashed border-border")
          }
        />
        <p className="mt-1 text-right text-xs text-secondary">
          {t("aiEmail.paste.charCount", { count: emailText.length })}
        </p>
      </div>

      {hasText && (
        <div className="flex items-start gap-2 rounded-[10px] border border-primary/20 bg-primary/5 p-3 text-xs text-secondary">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
          <span>{t("aiEmail.paste.hint")}</span>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        disabled={!hasText}
        onClick={() => onAnalyze(emailText)}
        className="w-full"
      >
        <Sparkles size={16} />
        {t("aiEmail.paste.submit")}
      </Button>
    </div>
  );
}
