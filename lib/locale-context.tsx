"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { messages, type Locale } from "@/lib/i18n/messages";

type TranslateVars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
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

function getByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

// {name} 형태의 자리표시자를 vars 값으로 치환한다. 일치하는 값이 없으면 그대로 둔다.
function applyVars(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, varName) =>
    varName in vars ? String(vars[varName]) : match
  );
}

// 현재 locale 사전 → 일본어 사전 → 키 문자열 순으로 대체한다.
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const primary = getByPath(messages[locale], key);
  if (typeof primary === "string") return applyVars(primary, vars);

  if (process.env.NODE_ENV === "development") {
    console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
  }

  if (locale !== "ja") {
    const fallback = getByPath(messages.ja, key);
    if (typeof fallback === "string") return applyVars(fallback, vars);
  }

  return key;
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

export function LocaleProvider({ children, initialLocale = "ja", locked = false }: LocaleProviderProps) {
  // 서버 프리렌더와 클라이언트 최초 렌더를 동일하게 유지하기 위해 항상 initialLocale로
  // 시작하고(기본값 "ja", 지금까지와 동일), 실제 저장된 값은 마운트 이후에만 반영해
  // hydration mismatch를 피한다.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

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
    });
  }, [locked]);

  async function setLocale(next: Locale) {
    if (locked) return;
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.auth.updateUser({ data: { language: next } });

    if (error && process.env.NODE_ENV === "development") {
      console.error("[locale] updateUser 실패:", {
        status: error.status,
        code: error.code,
        message: error.message,
        name: error.name,
      });
    }
  }

  const t = useMemo(
    () => (key: string, vars?: TranslateVars) => translate(locale, key, vars),
    [locale]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return { locale: context.locale, setLocale: context.setLocale };
}

export function useT() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useT must be used within a LocaleProvider");
  }
  return context.t;
}
