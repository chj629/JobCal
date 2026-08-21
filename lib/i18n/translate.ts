import { messages, type Locale } from "@/lib/i18n/messages";

type TranslateVars = Record<string, string | number>;

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

// "use client"가 아닌 순수 함수 모듈로 따로 둔다 — lib/locale-context.tsx(use client)에서
// export하는 함수는 서버 컴포넌트(예: app/*/page.tsx의 metadata export)에서 호출할 수
// 없다(Next.js가 빌드 시 "client에서만 호출 가능"으로 막는다). 공개 페이지(legal/pricing)
// metadata가 이 함수를 직접 써야 해서 분리했다. lib/locale-context.tsx는 기존 호출부
// 호환을 위해 이 함수를 그대로 re-export한다.
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
