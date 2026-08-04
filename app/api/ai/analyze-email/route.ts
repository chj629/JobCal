import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_ANALYSIS_JSON_SCHEMA,
  buildEmailAnalysisPrompt,
  parseEmailAnalysisResult,
} from "@/lib/ai/emailAnalysis";

export const runtime = "nodejs";

const MAX_EMAIL_LENGTH = 8000;
const DEFAULT_MODEL = "gpt-4.1-mini";

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
    const result = parseEmailAnalysisResult(parsedContent);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI 응답을 해석할 수 없습니다." }, { status: 502 });
  }
}
