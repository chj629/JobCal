import { NextResponse } from "next/server";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/lib/config";
import { checkContactRateLimit } from "@/lib/contactRateLimit";

export const runtime = "nodejs";

// app/contact/page.tsx의 MAX_MESSAGE_LENGTH와 반드시 같은 값을 유지한다.
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// jobcal.app 도메인이 Resend에서 Verified 상태이므로 인증된 도메인 발신 주소를 사용한다.
const FROM_ADDRESS = "JobCal <contact@jobcal.app>";

interface ContactRequestBody {
  name: unknown;
  email: unknown;
  message: unknown;
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  // 클라이언트 검증만 신뢰하지 않는다 — rate limit도 실제 발송(과금·스팸) 이전에 먼저 확인.
  const clientKey = getClientKey(request);
  if (!checkContactRateLimit(clientKey)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, {
      status: 429,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !CONTACT_EMAIL) {
    console.error("[contact] RESEND_API_KEY 또는 CONTACT_EMAIL이 설정되지 않았습니다.");
    return NextResponse.json({ error: "문의 전송 기능이 아직 설정되지 않았습니다." }, {
      status: 500,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const { name, email, message } = (body as ContactRequestBody) ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }
  if (typeof email !== "string" || !email.trim() || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "문의 내용을 입력해 주세요." }, { status: 400 });
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `문의 내용은 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  const receivedAt = new Date().toISOString();

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_EMAIL,
      replyTo: trimmedEmail,
      subject: `[JobCal 문의] ${trimmedName}`,
      text: [
        `이름: ${trimmedName}`,
        `이메일: ${trimmedEmail}`,
        `접수 시각: ${receivedAt}`,
        "",
        "문의 내용:",
        trimmedMessage,
      ].join("\n"),
      html: [
        `<p><strong>이름:</strong> ${escapeHtml(trimmedName)}</p>`,
        `<p><strong>이메일:</strong> ${escapeHtml(trimmedEmail)}</p>`,
        `<p><strong>접수 시각:</strong> ${escapeHtml(receivedAt)}</p>`,
        `<p><strong>문의 내용:</strong></p>`,
        `<p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br />")}</p>`,
      ].join("\n"),
    });

    if (error) {
      // Resend 에러 객체(및 API 키)는 클라이언트에 노출하지 않고 서버 로그에만 남긴다.
      console.error("[contact] Resend 발송 실패:", error.message);
      return NextResponse.json({ error: "문의 전송에 실패했습니다." }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] Resend 요청 중 오류:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "문의 전송에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
