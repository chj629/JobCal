import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";

export type Locale = "ja" | "ko";

// lib/locale-context.tsx의 LocaleProvider가 쓰는 기본값과 동일하다(그쪽 initialLocale
// 파라미터 기본값도 이 상수를 그대로 참조한다) — 로그인 사용자의 locale을 서버에서
// 판정해야 하는 곳(app/api/ai/analyze-email/route.ts 등)이 이 값과 어긋나지 않도록
// 한 곳에서만 정의한다.
export const DEFAULT_LOCALE: Locale = "ja";

// ja.json을 기준 타입으로 삼는다. ko.json이 이 형태와 다르면(키 누락 등)
// 아래 messages 객체 리터럴에서 타입 에러로 드러난다.
export type Messages = typeof ja;

export const messages: Record<Locale, Messages> = {
  ja,
  ko,
};
