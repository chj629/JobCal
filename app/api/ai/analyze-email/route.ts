import { NextResponse } from "next/server";
import { createClient as createBearerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/paddle/getUserPlan";
import {
  EMAIL_ANALYSIS_JSON_SCHEMA,
  buildEmailAnalysisPrompt,
  parseEmailAnalysisResult,
  type EmailAnalysisResult,
} from "@/lib/ai/emailAnalysis";
import { formatDateKeyInAsiaTokyo, formatDateTimeInAsiaTokyo } from "@/lib/date";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/messages";

export const runtime = "nodejs";

const MAX_EMAIL_LENGTH = 8000;
const DEFAULT_MODEL = "gpt-4.1-mini";
// OpenAI 비용 남용 방지 한도. Free/Pro는 lib/paddle/getUserPlan.ts가 paddle_subscriptions
// (webhook이 채우는 source of truth)를 기준으로 서버에서만 판정하며, 요청 바디 등
// 클라이언트가 보낸 값은 전혀 참고하지 않는다.
// - Free: 가입 이후 누적 총 사용 횟수("평생 무료" 한도) — 월이 바뀌어도 리셋되지 않는다.
// - Pro: 이번 달(calendar month) 사용 횟수만 — 다음 달이 되면 0부터 다시 시작한다.
// 두 값 모두 supabase/migrations/0016_create_ai_analysis_usage.sql의 사용자·일자별
// call_count를 그대로 합산해서 계산한다 — 별도 누적/월간 컬럼이나 테이블을 새로 두지
// 않는다. "합계 확인 + 조건부 증가"는 increment_ai_analysis_usage() 함수 안에서 한
// 트랜잭션으로 원자적으로 처리된다(0025 마이그레이션) — 한도를 넘긴 요청은 이 함수가
// 아예 증가시키지 않고 allowed=false만 반환하므로, route.ts는 그 결과만 보고 분기한다.
const FREE_LIFETIME_ANALYSIS_LIMIT = 10;
const PRO_MONTHLY_ANALYSIS_LIMIT = 300;
// 기존 JSON schema(companyName/stepName/resultOption/events/contacts/memo) 결과가
// 충분히 들어가는 수준의 출력 토큰 상한. 프롬프트/모델/응답 구조는 그대로 두고 비용
// 상한선만 둔다.
const MAX_OUTPUT_TOKENS = 1200;

export async function POST(request: Request) {
  // 모바일 앱(jobcal-mobile)은 쿠키가 없으므로 Authorization: Bearer <access_token>을
  // 대신 보낸다. lib/supabase/proxy.ts가 이 경로 하나에만 좁게 예외를 두어 여기까지
  // 통과시키므로, 실제 토큰 검증은 이 함수가 담당한다. anon/publishable key + 그
  // Authorization 헤더로 만든 클라이언트는 PostgREST/GoTrue가 헤더의 JWT로 auth.uid()를
  // 판정하므로, 아래 getUserPlan/increment_ai_analysis_usage/OpenAI 호출/파싱 로직은
  // 어느 클라이언트가 들어오든 전혀 수정 없이 동일하게 동작한다. service role은 여기서도
  // 쓰지 않는다 — Bearer 클라이언트도 기존 쿠키 클라이언트와 동일하게 anon key + RLS다.
  const authHeader = request.headers.get("authorization");
  const supabase = authHeader?.startsWith("Bearer ")
    ? createBearerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
    : await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 클라이언트가 body로 locale을 보내게 하지 않는다 — user_metadata.language는 signup/
  // 로그인 시점에 이미 서버(auth/callback, SignupPageContent)가 채워두므로, 방금 조회한
  // 이 user에서 그대로 읽으면 클라이언트를 신뢰하지 않고도 "JobCal 현재 언어"를 알 수 있다.
  // 값이 없거나 ko/ja가 아니면 lib/locale-context.tsx의 LocaleProvider와 동일한 기본값으로
  // 폴백한다.
  const rawLanguage = user.user_metadata?.language;
  const locale: Locale = rawLanguage === "ko" || rawLanguage === "ja" ? rawLanguage : DEFAULT_LOCALE;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI 분석 기능이 아직 설정되지 않았습니다." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const emailText =
    typeof body === "object" && body !== null && "emailText" in body
      ? (body as { emailText: unknown }).emailText
      : null;

  if (typeof emailText !== "string" || !emailText.trim()) {
    return NextResponse.json({ error: "이메일 원문을 입력해 주세요." }, { status: 400 });
  }

  if (emailText.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json(
      { error: `이메일 원문은 ${MAX_EMAIL_LENGTH}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }

  // 사용량 소비는 "실제로 분석 결과를 만들어 줄 수 있었을 때만" 일어난다(맨 아래 6번
  // 참고) — 여기서는 OpenAI를 부르기 전에 이미 명백히 한도를 넘긴 사용자를 걸러내는
  // 가벼운 사전 확인만 한다. 이 SELECT는 락도, 증가도 없는 단순 조회라 동시 요청끼리
  // 서로 다른 값을 볼 수 있고, 그래서 이 값만으로는 "몇 명까지 통과시킬지"를 최종
  // 결정하지 않는다 — 그 권한은 오직 6번의 increment_ai_analysis_usage() RPC(0025,
  // 사용자별 advisory lock으로 직렬화되는 원자적 함수)에만 있다. 이 사전 확인이
  // 통과해도 최종 RPC가 allowed=false를 반환할 수 있고(그 사이 다른 동시 요청이 마지막
  // 자리를 채간 경우), 그 경우 이미 받은 OpenAI 결과는 버리고 429를 반환한다.
  const plan = await getUserPlan(supabase);
  const scope = plan === "pro" ? "month" : "lifetime";
  const limit = plan === "pro" ? PRO_MONTHLY_ANALYSIS_LIMIT : FREE_LIFETIME_ANALYSIS_LIMIT;
  const now = new Date();
  const usageDate = formatDateKeyInAsiaTokyo(now);

  const { data: precheckRows, error: precheckError } =
    scope === "month"
      ? await supabase
          .from("ai_analysis_usage")
          .select("call_count")
          .gte("usage_date", `${usageDate.slice(0, 7)}-01`)
      : await supabase.from("ai_analysis_usage").select("call_count");

  if (precheckError) {
    // DB 조회 자체가 실패한 것이지 한도를 넘긴 게 아니므로, free_limit_exceeded/
    // pro_limit_exceeded로 오인되지 않도록 429가 아닌 500 + 별도 메시지로 응답한다.
    console.error("[analyze-email] 사용량 사전 확인 실패:", precheckError.message);
    return NextResponse.json({ error: "사용량 확인에 실패했습니다." }, { status: 500 });
  }

  const precheckTotal = (precheckRows ?? []).reduce((sum, row) => sum + row.call_count, 0);

  if (precheckTotal >= limit) {
    // code: 클라이언트(AI Drawer UI)가 Free 사용자에게는 Pro 업그레이드 안내를, Pro
    // 사용자에게는 단순 한도 초과 안내를 구분해서 보여줄 수 있도록 하는 용도.
    return NextResponse.json(
      {
        error:
          plan === "pro"
            ? `이번 달 AI 분석 사용 한도(${limit}회)를 초과했습니다.`
            : `무료 AI 분석 사용 한도(${limit}회)를 모두 사용했습니다.`,
        code: plan === "pro" ? "pro_limit_exceeded" : "free_limit_exceeded",
      },
      { status: 429 }
    );
  }

  // UTC Z 문자열을 "한국 표준시"라고 설명하면 모델이 이메일의 현지 벽시계 값에 Z를
  // 그대로 붙일 수 있다. 프롬프트의 기준 시각 자체를 명시적인 Asia/Tokyo +09:00로 준다.
  const nowIso = formatDateTimeInAsiaTokyo(now);
  const { system, user: userPrompt } = buildEmailAnalysisPrompt(emailText.trim(), nowIso, locale);

  let completionResponse: Response;
  try {
    completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_schema", json_schema: EMAIL_ANALYSIS_JSON_SCHEMA },
      }),
    });
  } catch {
    return NextResponse.json({ error: "AI 분석 요청에 실패했습니다." }, { status: 502 });
  }

  if (!completionResponse.ok) {
    const errorBody = await completionResponse.text();
    // API 키는 절대 로그에 남기지 않는다. status와 OpenAI 오류 본문만 출력.
    console.error(
      `[analyze-email] OpenAI 요청 실패 (status ${completionResponse.status}):`,
      errorBody
    );

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? `AI 분석 요청에 실패했습니다. (status ${completionResponse.status}) ${errorBody.slice(0, 300)}`
          : "AI 분석 요청에 실패했습니다.",
      },
      { status: 502 }
    );
  }

  const completionJson = await completionResponse.json();
  const content = completionJson?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "AI 응답을 해석할 수 없습니다." }, { status: 502 });
  }

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI 응답을 해석할 수 없습니다." }, { status: 502 });
  }

  let result: EmailAnalysisResult;
  try {
    result = parseEmailAnalysisResult(parsedContent, emailText.trim(), locale);
  } catch {
    return NextResponse.json({ error: "AI 응답을 해석할 수 없습니다." }, { status: 502 });
  }

  // 6. 여기까지 왔다는 것은 사용자에게 돌려줄 분석 결과가 실제로 준비됐다는 뜻이다 —
  // 이 시점에만 increment_ai_analysis_usage()(0025, 사용자별 advisory lock으로
  // 직렬화되는 원자적 함수)를 호출해 "지금도 여전히 한도 안인지 다시 확인 + 1회 소비"를
  // 한 번에 처리한다. 위 사전 확인과 이 호출 사이에 다른 동시 요청이 끼어들어 그 사이
  // 한도가 채워졌더라도, 실제로 몇 건까지 통과시킬지는 이 RPC 하나만이 최종 결정한다.
  const { data, error: usageError } = await supabase
    .rpc("increment_ai_analysis_usage", {
      p_usage_date: usageDate,
      p_scope: scope,
      p_limit: limit,
    })
    .single();

  if (usageError) {
    console.error("[analyze-email] 사용량 확정 실패:", usageError.message);
    return NextResponse.json({ error: "사용량 확인에 실패했습니다." }, { status: 500 });
  }

  // 0025 마이그레이션의 increment_ai_analysis_usage(date, text, integer)가
  // returns table(allowed boolean, usage_count integer, usage_limit integer)로 정의돼
  // 있어 이 함수 호출은 항상 이 3개 필드를 가진 행 하나를 반환한다(에러가 아니라면).
  const usageResult = data as { allowed: boolean; usage_count: number; usage_limit: number };

  if (!usageResult.allowed) {
    // 8. 이미 받아둔 OpenAI 분석 결과(result)는 사용자에게 절대 반환하지 않고 버린다 —
    // 동시 요청 중 한도를 채운 다른 요청에게 자리를 내준 경우다. usage_count나 RPC
    // 관련 내부 정보는 응답에 담지 않는다.
    return NextResponse.json(
      {
        error:
          plan === "pro"
            ? `이번 달 AI 분석 사용 한도(${limit}회)를 초과했습니다.`
            : `무료 AI 분석 사용 한도(${limit}회)를 모두 사용했습니다.`,
        code: plan === "pro" ? "pro_limit_exceeded" : "free_limit_exceeded",
      },
      { status: 429 }
    );
  }

  // 7. 최종 소비까지 성공했을 때만 결과를 반환한다.
  return NextResponse.json(result);
}
