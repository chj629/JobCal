"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollReveal from "@/components/landing/ScrollReveal";

// react-hooks/static-components 규칙 때문에 렌더 함수 안이 아니라 모듈
// 최상위에 선언한다(안 그러면 리렌더마다 새 컴포넌트로 취급돼 매번 다시
// mount된다). CardShell/StepNode는 순수 마크업이라 props만 받고, DrawerHeader는
// 자기 t()를 직접 호출한다(LocaleProvider 안이면 어디서든 안전).
function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white shadow-[0_16px_36px_rgba(30,58,138,0.12)]">
      {children}
    </div>
  );
}

function DrawerHeader() {
  const t = useT();
  return (
    <span className="flex items-center gap-2 border-b border-stitch-border px-5 py-4">
      <MaterialIcon name="auto_awesome" size={18} className="text-primary-navy" />
      <span className="text-[14px] font-[500] text-stitch-ink">{t("common.appName")} AI</span>
    </span>
  );
}

function StepNode({ index, isLast }: { index: number; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary-navy/20 bg-white text-[15px] font-[800] text-primary-navy shadow-[0_2px_10px_rgba(30,58,138,0.15)]">
        {`0${index + 1}`}
      </span>
      {!isLast && <span className="mt-1 w-px flex-1 bg-primary-navy/20" style={{ minHeight: "24px" }} />}
    </div>
  );
}

// 61차: Hero AI workflow의 모바일(<lg, 1024px 미만) 전용 버전. 데스크톱의
// LandingHeroDemo.tsx(가로 4-card, progress로 픽셀 단위 위치/스케일을 계산하는
// scroll-hijack 구조)는 "데스크톱 디자인/애니메이션 절대 수정 금지" 요청에 따라
// 단 한 줄도 건드리지 않았다 — 이 파일은 그 파일과 완전히 별개의 새 컴포넌트다.
// LandingHero.tsx가 데스크톱 버전은 hidden lg:block, 이 버전은 lg:hidden으로
// 감싸 뷰포트에 따라 둘 중 하나만 보이게 한다.
//
// 모바일은 desktop과 다른 전략을 쓴다 — desktop의 "스크롤 420px 안에서 카드가
// 좌→우로 자리잡으며 커진다"는 픽셀 단위 연출을 좁은 화면에 억지로 축소하는
// 대신(요청에서 명시적으로 금지), 01 메일 입력 카드를 첫 화면에 그대로 크게
// 보여주고(즉시, 스크롤 없이 — "첫 viewport에서 메일 화면이라는 것이 명확히
// 인식돼야 함" 요청), 그 아래 02~04 카드를 세로로 쌓아 각 카드가 스크롤에
// 걸릴 때마다 옅게 fade+살짝 떠오르며 나타나게 했다(랜딩 하단 Dashboard/
// Calendar/Companies showcase와 동일하게 이미 쓰고 있는 ScrollReveal 재사용 —
// "복잡한 움직임은 줄여도 된다" 요청에 맞는 가장 단순한 scroll reveal).
// 카드 내부 문구/필드는 데스크톱과 완전히 같은 i18n 키를 그대로 재사용한다
// (새 문구를 만들지 않음) — 다만 desktop의 "scale-trick"(원래 크기로 그린 뒤
// CSS transform:scale로 축소)은 모바일에 가져올 이유가 없어(애초에 모바일
// 폭에 맞는 자연스러운 크기로 바로 그리면 됨) 걷어내고, 실제 렌더 폭에 맞는
// 보통 Tailwind 크기로 다시 짰다.
export default function LandingHeroMobileDemo() {
  const t = useT();

  const companyName = t("landing.hero.demo.companyName");
  const companyInitial = companyName.charAt(0);
  const step = t("landing.scene.step");
  const dateTime = t("landing.scene.dateTime");

  const mailSubject = t("landing.hero.mailSubject");
  const inboxTag = t("landing.hero.demo.inboxTag");
  const senderEmail = t("landing.hero.demo.senderEmail");
  const recipientTo = t("landing.hero.demo.recipientTo");
  const receivedAt = t("landing.hero.demo.receivedAt");
  const recipientLine = t("landing.hero.demo.recipientLine");
  const greetingLine = t("landing.hero.demo.greetingLine");
  const senderLine = t("landing.hero.demo.senderLine", { company: companyName });
  const thanksLine = t("landing.hero.demo.thanksLine");
  const bodyLine = t("landing.hero.demo.bodyLine", { step });
  const datetimeLine = t("landing.hero.demo.datetimeLine");

  const fieldCompanyLabel = t("landing.hero.demo.fieldCompany");
  const fieldDateTimeLabel = t("landing.hero.demo.fieldDateTime");
  const fieldStepStageLabel = t("aiEmail.paste.extractFields.step");
  const fieldMemoLabel = t("aiEmail.review.memoLabel");
  const memoNote = t("landing.hero.demo.memoNote");
  const extractTitle = t("aiEmail.review.title");
  const completeTitle = t("landing.hero.demo.complete");

  const EXTRACT_FIELD_KEYS = [
    "aiEmail.paste.extractFields.company",
    "aiEmail.paste.extractFields.step",
    "aiEmail.paste.extractFields.result",
    "aiEmail.paste.extractFields.schedule",
    "aiEmail.paste.extractFields.contact",
    "aiEmail.paste.extractFields.url",
    "aiEmail.paste.extractFields.memo",
  ];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-10 px-1">
      <div className="flex gap-4">
        <StepNode index={0} isLast={false} />
        <div className="min-w-0 flex-1 pb-2">
          <p className="mb-1 text-[13px] font-[700] text-stitch-ink">{t("landing.hero.demo.stepMail")}</p>
          <p className="mb-4 text-[12px] leading-[1.5] whitespace-pre-line text-secondary">
            {t("landing.hero.demo.stepMailDesc")}
          </p>
          {/* 첫 viewport에서 곧바로 보여야 하는 카드라 ScrollReveal(스크롤
              진입 시 fade-in)로 감싸지 않고 항상 그대로 보여준다. */}
          <CardShell>
            <div className="flex items-center gap-2 border-b border-stitch-border px-4 py-3 text-secondary">
              <MaterialIcon name="inbox" size={16} />
              <span className="text-[12px] font-[500]">{inboxTag}</span>
            </div>
            <div className="px-4 py-4">
              <h3 className="mb-3 text-[17px] leading-[1.35] font-[500] tracking-tight text-stitch-ink">
                {mailSubject}
              </h3>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-navy text-[13px] font-[500] text-white">
                  {companyInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-[500] text-stitch-ink">{companyName}</p>
                  <p className="truncate text-[11px] text-secondary">{senderEmail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-secondary">{receivedAt}</span>
              </div>
              <p className="mb-3 text-[11px] text-secondary">{recipientTo}</p>
              <div className="space-y-3 text-[13px] leading-[1.7] text-stitch-ink">
                <p>{recipientLine}</p>
                <p>{greetingLine}</p>
                <p>{senderLine}</p>
                <p>{thanksLine}</p>
                <p>{bodyLine}</p>
                <p>{datetimeLine}</p>
              </div>
            </div>
          </CardShell>
        </div>
      </div>

      <div className="flex gap-4">
        <StepNode index={1} isLast={false} />
        <div className="min-w-0 flex-1 pb-2">
          <ScrollReveal>
            <p className="mb-1 text-[13px] font-[700] text-stitch-ink">{t("landing.hero.demo.stepAnalyze")}</p>
            <p className="mb-4 text-[12px] leading-[1.5] whitespace-pre-line text-secondary">
              {t("landing.hero.demo.stepAnalyzeDesc")}
            </p>
            <CardShell>
              <DrawerHeader />
              <div className="flex flex-col gap-4 px-5 py-6">
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-navy/10 text-primary-navy">
                    <MaterialIcon name="progress_activity" size={24} className="animate-spin" />
                  </span>
                  <h4 className="mt-1 text-[14px] font-[500] text-stitch-ink">
                    {t("aiEmail.paste.analyzingTitle")}
                  </h4>
                  <p className="text-[12px] text-secondary">{t("aiEmail.paste.analyzingDescription")}</p>
                </div>
                <div className="rounded-stitch-2xl border border-stitch-border bg-stitch-bg p-4">
                  <p className="mb-2 flex items-center gap-2 text-[12px] font-[500] text-secondary">
                    <MaterialIcon name="info" size={14} />
                    {t("aiEmail.paste.infoTitle")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXTRACT_FIELD_KEYS.map((key) => (
                      <span
                        key={key}
                        className="rounded-full border border-stitch-border bg-white px-2.5 py-1 text-[10px] text-stitch-ink"
                      >
                        {t(key)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardShell>
          </ScrollReveal>
        </div>
      </div>

      <div className="flex gap-4">
        <StepNode index={2} isLast={false} />
        <div className="min-w-0 flex-1 pb-2">
          <ScrollReveal>
            <p className="mb-1 text-[13px] font-[700] text-stitch-ink">{t("landing.hero.demo.stepExtract")}</p>
            <p className="mb-4 text-[12px] leading-[1.5] whitespace-pre-line text-secondary">
              {t("landing.hero.demo.stepExtractDesc")}
            </p>
            <CardShell>
              <DrawerHeader />
              <div className="flex flex-col gap-4 px-5 py-5">
                <h4 className="text-[18px] font-[500] tracking-tight text-stitch-ink">{extractTitle}</h4>
                <div className="space-y-1.5">
                  <p className="px-1 text-[12px] font-[500] text-stitch-ink">{fieldCompanyLabel}</p>
                  <div className="w-full rounded-full border border-stitch-border bg-white px-4 py-2 text-[14px] text-stitch-ink">
                    {companyName}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-[12px] font-[500] text-stitch-ink">{fieldStepStageLabel}</p>
                  <div className="w-full rounded-full border border-stitch-border bg-white px-4 py-2 text-[14px] text-stitch-ink">
                    {step}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-[12px] font-[500] text-stitch-ink">{fieldDateTimeLabel}</p>
                  <div className="w-full rounded-full border border-stitch-border bg-white px-4 py-2 text-[14px] text-stitch-ink">
                    {dateTime}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-[12px] font-[500] text-stitch-ink">{fieldMemoLabel}</p>
                  <div className="rounded-stitch-2xl border border-stitch-border bg-white p-4 text-[13px] leading-[1.6] text-stitch-ink">
                    {memoNote}
                  </div>
                </div>
              </div>
            </CardShell>
          </ScrollReveal>
        </div>
      </div>

      <div className="flex gap-4">
        <StepNode index={3} isLast={true} />
        <div className="min-w-0 flex-1">
          <ScrollReveal>
            <p className="mb-1 text-[13px] font-[700] text-stitch-ink">{t("landing.hero.demo.stepComplete")}</p>
            <p className="mb-4 text-[12px] leading-[1.5] whitespace-pre-line text-secondary">
              {t("landing.hero.demo.stepCompleteDesc")}
            </p>
            <CardShell>
              <DrawerHeader />
              <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <MaterialIcon name="check_circle" size={32} filled className="text-success" />
                </div>
                <h4 className="text-[20px] font-[500] tracking-tight text-stitch-ink">{completeTitle}</h4>
                <div className="space-y-0.5">
                  <p className="text-[13px] text-secondary">{companyName}</p>
                  <p className="text-[13px] text-secondary">{step}</p>
                  <p className="text-[13px] text-secondary">{dateTime}</p>
                </div>
              </div>
            </CardShell>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
