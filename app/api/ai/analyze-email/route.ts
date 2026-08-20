import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/paddle/getUserPlan";
import {
  EMAIL_ANALYSIS_JSON_SCHEMA,
  buildEmailAnalysisPrompt,
  parseEmailAnalysisResult,
} from "@/lib/ai/emailAnalysis";

export const runtime = "nodejs";

const MAX_EMAIL_LENGTH = 8000;
const DEFAULT_MODEL = "gpt-4.1-mini";
// OpenAI 비용 남용 방지: 로그인 사용자 1명이 하루에 호출할 수 있는 최대 횟수. Free/Pro는
// lib/paddle/getUserPlan.ts가 paddle_subscriptions(webhook이 채우는 source of truth)를
// 기준으로 서버에서만 판정하며, 요청 바디 등 클라이언트가 보낸 값은 전혀 참고하지 않는다.
// supabase/migrations/0016_create_ai_analysis_usage.sql의 increment_ai_analysis_usage()가
// 이 한도와 무관하게 항상 카운트만 원자적으로 올려주고, 실제 "초과 시 차단" 판정은 여기
// route.ts가 반환된 횟수를 보고 수행한다.
const FREE_DAILY_ANALYSIS_LIMIT = 3;
const PRO_DAILY_ANALYSIS_LIMIT = 50;
// 기존 JSON schema(companyName/stepName/resultOption/events/contacts/memo) 결과가
// 충분히 들어가는 수준의 출력 토큰 상한. 프롬프트/모델/응답 구조는 그대로 두고 비용
// 상한선만 둔다.
const MAX_OUTPUT_TOKENS = 1200;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

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

  // OpenAI 호출 전 마지막 관문: 하루 호출 횟수 제한. increment_ai_analysis_usage()는 항상
  // auth.uid()(=이 요청의 user.id와 동일, RLS로 보장)로만 판정해 클라이언트가 다른 사용자의
  // 카운트를 조작할 수 없고, 이 판정 자체도 서버(Route Handler)에서만 이뤄진다 — 클라이언트가
  // 우회할 방법이 없다. 한도 자체(Free 3회 / Pro 50회)도 같은 이유로 getUserPlan()이 서버
  // 세션 기준으로 조회한 실제 구독 상태로만 정해진다.
  const plan = await getUserPlan(supabase);
  const dailyLimit = plan === "pro" ? PRO_DAILY_ANALYSIS_LIMIT : FREE_DAILY_ANALYSIS_LIMIT;

  const usageDate = new Date().toISOString().slice(0, 10);
  const { data: usageCount, error: usageError } = await supabase.rpc(
    "increment_ai_analysis_usage",
    { p_usage_date: usageDate }
  );

  if (usageError) {
    console.error("[analyze-email] 사용량 확인 실패:", usageError.message);
    return NextResponse.json({ error: "사용량 확인에 실패했습니다." }, { status: 500 });
  }

  if (typeof usageCount === "number" && usageCount > dailyLimit) {
    // code: 클라이언트(추후 AI Drawer UI)가 Free 사용자에게는 Pro 업그레이드 안내를,
    // Pro 사용자에게는 단순 한도 초과 안내를 구분해서 보여줄 수 있도록 하는 용도.
    // usageCount나 RPC 관련 내부 정보는 응답에 담지 않는다.
    return NextResponse.json(
      {
        error: `일일 AI 분석 사용 한도(${dailyLimit}회)를 초과했습니다.`,
        code: plan === "pro" ? "pro_limit_exceeded" : "free_limit_exceeded",
      },
      { status: 429 }
    );
  }

  const nowIso = new Date().toISOString();
  const { system, user: userPrompt } = buildEmailAnalysisPrompt(emailText.trim(), nowIso);

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

  try {
    const result = parseEmailAnalysisResult(parsedContent, emailText.trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI 응답을 해석할 수 없습니다." }, { status: 502 });
  }
}
