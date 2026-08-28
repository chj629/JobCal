"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";

// 기존 호출부(app/(app)/settings/page.tsx 등)가 "@/lib/locale-context"에서 translate를
// import해 왔으므로 그대로 재수출한다 — 실제 구현은 lib/i18n/translate.ts로 옮겼다(서버
// 컴포넌트의 metadata export에서도 호출할 수 있어야 해서 "use client"가 아닌 모듈이 필요).
export { translate };

type TranslateVars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  // 현재 로그인 사용자 기준으로 locale 초기화(localStorage 확인 + user_metadata.language
  // 조회)가 끝났는지. false인 동안의 locale은 기본값("ja")이거나 localStorage의 임시값일
  // 뿐 아직 확정이 아니므로, 온보딩처럼 "처음 딱 한 번만 보여줘야 하는" 화면은 이 값이
  // true가 되기 전에는 렌더링을 시작하면 안 된다(components/Header.tsx 참고). locked
  // Provider는 애초에 기다릴 비동기 확정이 없어 처음부터 true다.
  ready: boolean;
  // 로그인 사용자는 Supabase user_metadata 저장까지 성공해야 true를 반환하고 locale을
  // 커밋한다. Settings는 이 결과를 await해 실제 저장 결과와 toast를 일치시킨다.
  setLocale: (locale: Locale) => Promise<boolean>;
  t: (key: string, vars?: TranslateVars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// 랜딩(/, /ko)의 locked Provider가 마운트되어 있는 동안, root layout의 (locked가 아닌)
// 바깥쪽 Provider가 document.documentElement.lang을 건드리지 못하게 막는 플래그.
// 두 Provider는 별개의 컴포넌트 인스턴스라 서로의 상태를 모를 수밖에 없는데, 바깥쪽
// Provider도 자신만의 localStorage 동기화 effect를 계속 돌리기 때문에(그 자체는
// 의도대로 locked 트리의 화면 텍스트에는 영향을 주지 않는다 — 화면은 항상 가장 안쪽
// Context를 읽는다), 그 effect가 <html lang>만은 전역 DOM 속성이라 뒤늦게 덮어쓸 수
// 있었다("locked인데 마운트 후 언어가 바뀌면 안 된다"는 요구사항 위반). 카운터로 두면
// locked Provider가 여러 개 겹쳐도(사실상 없지만) 안전하다.
let lockedProviderCount = 0;

// 비로그인 상태(Landing/로그인/회원가입 등)에서 고른 언어를 기억해 두는 키.
// 로그인 사용자의 Supabase user_metadata.language가 있으면 그 값이 항상 우선한다.
const LOCALE_STORAGE_KEY = "jobcal:locale";

function isLocale(value: unknown): value is Locale {
  return value === "ja" || value === "ko";
}

interface LocaleProviderProps {
  children: ReactNode;
  // 마케팅 랜딩(/, /ko) 전용 옵션. 기본값(둘 다 생략)은 지금까지와 완전히 동일하게
  // 동작한다 — 기존 (app)/인증/설정 화면은 이 두 prop을 전혀 넘기지 않으므로 아래
  // 분기는 항상 기존 경로(초기값 "ja" + localStorage/user_metadata 동기화)를 탄다.
  initialLocale?: Locale;
  // true면 이 Provider는 localStorage/Supabase user_metadata를 전혀 읽지 않고
  // initialLocale에 "고정"된다 — /ko의 SSR 첫 렌더(한국어)가 마운트 직후
  // localStorage에 남아있는 다른 언어(예: "ja")로 되돌아가는 것을 막기 위함이다.
  // 랜딩은 로그인 여부와 무관하게 항상 URL이 곧 언어이므로, 이 Provider 트리 안에서는
  // setLocale도 아무 일도 하지 않는다(랜딩에서는 URL 이동으로 언어를 바꾸고, 이
  // Provider의 setLocale을 호출하지 않는 것이 정상 경로 — locked 상태에서 실수로
  // 호출되더라도 로컬 상태나 저장소를 건드리지 않도록 안전장치만 둔다).
  locked?: boolean;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  locked = false,
}: LocaleProviderProps) {
  // 서버 프리렌더와 클라이언트 최초 렌더를 동일하게 유지하기 위해 항상 initialLocale로
  // 시작하고(기본값 "ja", 지금까지와 동일), 실제 저장된 값은 마운트 이후에만 반영해
  // hydration mismatch를 피한다.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  // locked Provider(랜딩/인증 등 URL이 곧 언어인 트리)는 localStorage/user_metadata를
  // 아예 읽지 않으므로 기다릴 것 없이 처음부터 ready다. 일반 Provider는 아래 두 확인이
  // 모두 끝나야(특히 user_metadata 조회는 네트워크 왕복) ready가 true로 바뀐다.
  const [ready, setReady] = useState(locked);

  useEffect(() => {
    if (!locked) return;
    lockedProviderCount += 1;
    return () => {
      lockedProviderCount -= 1;
    };
  }, [locked]);

  useEffect(() => {
    // locked 트리가 화면 어딘가에 마운트되어 있다면, locked가 아닌(바깥쪽) Provider는
    // <html lang>을 쓰지 않는다 — 그 값은 locked Provider가 이미 고정해 둔 값이 맞다.
    if (!locked && lockedProviderCount > 0) return;
    document.documentElement.lang = locale;
  }, [locale, locked]);

  // localStorage 확인은 마이크로태스크로 한 틱 미뤄 effect 본문에서 동기적으로
  // setState하지 않는다(react-hooks/set-state-in-effect 회피). 아래 Supabase 조회는
  // 네트워크 왕복이 필요해 항상 이 마이크로태스크보다 늦게 끝나므로, 로그인 사용자의
  // 저장된 언어가 있으면 이 값을 자연스럽게 덮어써 Settings에서 정한 언어가 항상
  // 우선한다("충돌하지 않도록" 요구사항). locked면 이 동기화 자체를 건너뛴다.
  useEffect(() => {
    if (locked) return;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      queueMicrotask(() => setLocaleState(stored));
    }
  }, [locked]);

  useEffect(() => {
    if (locked) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const savedLocale = user?.user_metadata?.language;
      if (isLocale(savedLocale)) {
        setLocaleState(savedLocale);
        window.localStorage.setItem(LOCALE_STORAGE_KEY, savedLocale);
      }
      // 사용자가 없거나 user_metadata에 language가 없어도, 확인 자체는 끝났으므로 ready로
      // 넘어간다 — 이 시점 이후의 locale이 이번 로그인 사용자 기준 최종값이다.
      setReady(true);
    });
  }, [locked]);

  async function setLocale(next: Locale) {
    if (locked) return false;
    if (next === locale) return true;

    const supabase = createClient();
    try {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      // 세션 만료나 네트워크 오류는 비로그인 상태와 구분한다. 이 경우 UI/localStorage를
      // 먼저 바꾸지 않아 서버 metadata와 화면 언어가 어긋나지 않는다.
      if (getUserError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[locale] getUser 실패:", {
            status: getUserError.status,
            code: getUserError.code,
            message: getUserError.message,
            name: getUserError.name,
          });
        }
        return false;
      }

      // 실제 변경 버튼이 있는 Settings는 인증 영역이다. 세션이 사라졌는데 user만 null로
      // 반환되는 경우도 성공으로 간주하거나 localStorage만 바꾸지 않는다.
      if (!user) return false;

      const { error } = await supabase.auth.updateUser({ data: { language: next } });

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[locale] updateUser 실패:", {
            status: error.status,
            code: error.code,
            message: error.message,
            name: error.name,
          });
        }
        return false;
      }

      // metadata 저장 성공 후에만 로컬 상태를 커밋한다. 따라서 실패 시 별도 rollback 없이
      // UI와 localStorage, user_metadata가 모두 기존 값으로 남는다.
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      setLocaleState(next);
      return true;
    } catch (error) {
      // fetch 자체가 reject되는 네트워크 오류도 저장 실패로 취급한다.
      if (process.env.NODE_ENV === "development") {
        console.error("[locale] 언어 저장 중 예외:", error);
      }
      return false;
    }
  }

  const t = useMemo(
    () => (key: string, vars?: TranslateVars) => translate(locale, key, vars),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, ready, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return { locale: context.locale, ready: context.ready, setLocale: context.setLocale };
}

export function useT() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useT must be used within a LocaleProvider");
  }
  return context.t;
}
