export interface ContactFormPayload {
  name: string;
  email: string;
  message: string;
}

export type ContactSubmitResult = { status: "success" } | { status: "error" };

// app/api/contact/route.ts(Resend 발송)를 호출한다. 발송 실패/네트워크 오류/서버 오류를
// 구분하지 않고 전부 "error"로 통일한다 — 클라이언트는 재시도를 유도하는 일반 안내만
// 보여주면 충분하고, 서버 쪽 상세 원인은 route.ts가 로그로만 남긴다(내부 정보 비노출).
export async function submitContactInquiry(
  payload: ContactFormPayload
): Promise<ContactSubmitResult> {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { status: "error" };
    }

    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}
