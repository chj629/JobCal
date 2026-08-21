"use client";

import { useRef, useState, type FormEvent } from "react";
import { useT } from "@/lib/locale-context";
import LegalPageShell from "@/components/legal/LegalPageShell";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { submitContactInquiry } from "@/lib/contactForm";

const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

// app/contact/page.tsx(ja)와 app/ko/contact/page.tsx(ko)가 공유하는 실제 페이지 본문 —
// 두 라우트 모두 이 컴포넌트를 그대로 렌더링하고, 감싸는 LocaleProvider(locked)의
// initialLocale만 다르다. 본문을 언어별로 복제하지 않는다.
//
// lib/contactForm.ts의 submitContactInquiry → app/api/contact(Resend 발송)를 호출한다.
// 발송 성공/실패만 구분해 보여주고("error"는 검증 실패/네트워크 오류/발송 실패를 모두
// 포함 — 서버 쪽 상세 원인은 route.ts가 로그로만 남긴다), 성공 시에만 폼을 비운다.
export default function ContactPageContent() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  // isSubmitting(state)는 리렌더가 반영돼야 button disabled에 실제로 적용된다. 같은 동기
  // 실행 구간에서 클릭이 연달아 여러 번 들어오면(예: 매우 빠른 연타) 리렌더 전에 handleSubmit이
  // 다시 호출될 수 있어 state만으로는 중복 제출을 막지 못한다 — ref는 즉시(동기) 갱신되므로
  // 여기서만 재진입 가드로 쓴다.
  const isSubmittingRef = useRef(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!name.trim()) next.name = t("legal.contact.form.errors.nameRequired");
    if (!email.trim()) next.email = t("legal.contact.form.errors.emailRequired");
    else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = t("legal.contact.form.errors.emailInvalid");
    }
    if (!message.trim()) next.message = t("legal.contact.form.errors.messageRequired");
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    setSubmitStatus("idle");

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const result = await submitContactInquiry({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setSubmitStatus(result.status);

    if (result.status === "success") {
      setName("");
      setEmail("");
      setMessage("");
    }
  }

  const inputClass = (hasError: boolean) =>
    "w-full rounded-full border bg-white px-5 py-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-all focus:outline-none focus:ring-2 " +
    (hasError
      ? "border-error focus:border-error focus:ring-error/20"
      : "border-neutral-300 focus:border-primary-navy focus:ring-[#dbeafe]");

  const textareaClass = (hasError: boolean) =>
    "w-full rounded-3xl border bg-white px-5 py-4 text-[15px] leading-[1.6] text-neutral-900 placeholder:text-neutral-300 transition-all focus:outline-none focus:ring-2 " +
    (hasError
      ? "border-error focus:border-error focus:ring-error/20"
      : "border-neutral-300 focus:border-primary-navy focus:ring-[#dbeafe]");

  return (
    <LegalPageShell title={t("legal.contact.title")}>
      <p className="text-[14px] leading-[1.7] text-neutral-600">{t("legal.contact.description")}</p>

      <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-6">
        <div className="space-y-2">
          <label htmlFor="contact-name" className="block text-[14px] font-[400] text-neutral-900">
            {t("legal.contact.form.nameLabel")}
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("legal.contact.form.namePlaceholder")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className={inputClass(Boolean(errors.name))}
          />
          {errors.name && (
            <p id="contact-name-error" className="text-[13px] text-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="contact-email" className="block text-[14px] font-[400] text-neutral-900">
            {t("legal.contact.form.emailLabel")}
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("legal.contact.form.emailPlaceholder")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={inputClass(Boolean(errors.email))}
          />
          {errors.email && (
            <p id="contact-email-error" className="text-[13px] text-error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="contact-message" className="block text-[14px] font-[400] text-neutral-900">
              {t("legal.contact.form.messageLabel")}
            </label>
            <span className="text-[12px] text-neutral-400">
              {t("legal.contact.form.messageCounter", {
                count: message.length,
                max: MAX_MESSAGE_LENGTH,
              })}
            </span>
          </div>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("legal.contact.form.messagePlaceholder")}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={6}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            className={textareaClass(Boolean(errors.message))}
          />
          {errors.message && (
            <p id="contact-message-error" className="text-[13px] text-error">
              {errors.message}
            </p>
          )}
        </div>

        {submitStatus === "success" && (
          <p className="rounded-2xl border border-success/40 bg-success/5 px-5 py-3.5 text-[13px] leading-[1.6] text-success">
            {t("legal.contact.form.successNotice")}
          </p>
        )}
        {submitStatus === "error" && (
          <p className="rounded-2xl border border-error/40 bg-error/5 px-5 py-3.5 text-[13px] leading-[1.6] text-error">
            {t("legal.contact.form.errorNotice")}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting && (
            <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
          )}
          {isSubmitting ? t("legal.contact.form.submitting") : t("legal.contact.form.submit")}
        </button>
      </form>
    </LegalPageShell>
  );
}
