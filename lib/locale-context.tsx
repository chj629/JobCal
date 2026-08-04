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
function translate(locale: Locale, key: string, vars?: TranslateVars): string {
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  // 서버 프리렌더와 클라이언트 최초 렌더를 동일하게 유지하기 위해 항상 "ja"로 시작하고,
  // 실제 저장된 값은 마운트 이후에만 반영해 hydration mismatch를 피한다.
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const savedLocale = user?.user_metadata?.language;
      if (isLocale(savedLocale)) {
        setLocaleState(savedLocale);
      }
    });
  }, []);

  async function setLocale(next: Locale) {
    setLocaleState(next);

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
