import { LocaleProvider } from "@/lib/locale-context";
import { buildAuthPageMetadata } from "@/lib/i18n/publicPageMetadata";
import AuthConfirmedPageContent from "@/components/auth/AuthConfirmedPageContent";

// description은 이 화면 전용 단일 문구 키가 없어(auth.confirmed는 title +
// messageLine1~3 구조), 화면에 이미 쓰이고 있는 messageLine1("JobCalへようこそ。" /
// "JobCal에 오신 것을 환영합니다.")을 그대로 재사용한다 — root layout의 description은
// ko 번역이 messages/ko.json에 없어(랜딩 전용 문구만 있음) 쓸 수 없었다.
export const metadata = buildAuthPageMetadata({
  locale: "ja",
  jaPath: "/auth/confirmed",
  titleKey: "auth.confirmed.title",
  descriptionKey: "auth.confirmed.messageLine1",
});

export default function AuthConfirmedPage() {
  return (
    <LocaleProvider initialLocale="ja" locked>
      <AuthConfirmedPageContent />
    </LocaleProvider>
  );
}
