import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";

export type Locale = "ja" | "ko";

// ja.json을 기준 타입으로 삼는다. ko.json이 이 형태와 다르면(키 누락 등)
// 아래 messages 객체 리터럴에서 타입 에러로 드러난다.
export type Messages = typeof ja;

export const messages: Record<Locale, Messages> = {
  ja,
  ko,
};
