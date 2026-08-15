import { DEFAULT_STEP_NAMES } from "@/lib/applicationSteps";

// docs/database.md: events.event_type
export type ExtractedEventType = "schedule" | "deadline" | "result_announcement";

const EXTRACTED_EVENT_TYPES: ExtractedEventType[] = ["schedule", "deadline", "result_announcement"];

// components/companies/EmailAnalysisReview.tsx의 RESULT_OPTION_KEYS와 동일한 4개 값.
export type EmailAnalysisResultOption = "inProgress" | "passed" | "failed" | "withdrawn";

const RESULT_OPTIONS: EmailAnalysisResultOption[] = ["inProgress", "passed", "failed", "withdrawn"];

export interface ExtractedEvent {
  eventType: ExtractedEventType;
  title: string;
  startsAt: string | null; // ISO 8601
  endsAt: string | null;
  dueAt: string | null;
  location: string | null;
  onlineUrl: string | null;
  memo: string | null;
}

export interface ExtractedContact {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

export interface EmailAnalysisResult {
  companyName: string | null;
  stepName: string | null;
  resultOption: EmailAnalysisResultOption;
  events: ExtractedEvent[];
  contacts: ExtractedContact[];
  memo: string | null;
}

// OpenAI structured outputs(json_schema, strict) 스키마.
// strict 모드는 모든 필드를 required로 요구하므로, 값이 없을 수 있는 필드는 type에 "null"을 포함시킨다.
export const EMAIL_ANALYSIS_JSON_SCHEMA = {
  name: "email_analysis_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["companyName", "stepName", "resultOption", "events", "contacts", "memo"],
    properties: {
      companyName: { type: ["string", "null"] },
      stepName: { type: ["string", "null"] },
      resultOption: { type: "string", enum: RESULT_OPTIONS },
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "eventType",
            "title",
            "startsAt",
            "endsAt",
            "dueAt",
            "location",
            "onlineUrl",
            "memo",
          ],
          properties: {
            eventType: { type: "string", enum: EXTRACTED_EVENT_TYPES },
            title: { type: "string" },
            startsAt: { type: ["string", "null"] },
            endsAt: { type: ["string", "null"] },
            dueAt: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            onlineUrl: { type: ["string", "null"] },
            memo: { type: ["string", "null"] },
          },
        },
      },
      contacts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "email", "phone", "role"],
          properties: {
            name: { type: "string" },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            role: { type: ["string", "null"] },
          },
        },
      },
      memo: { type: ["string", "null"] },
    },
  },
} as const;

// 이메일 원문과 서버 기준 현재 시각을 받아 OpenAI Chat Completions에 보낼 system/user 메시지를 만든다.
export function buildEmailAnalysisPrompt(emailText: string, nowIso: string) {
  const stepNameList = DEFAULT_STEP_NAMES.join(", ");

  const system = `당신은 일본 취업 활동 이메일에서 정보를 추출하는 도우미입니다.
사용자가 붙여넣은 채용 관련 이메일 원문을 분석해 아래 항목을 JSON으로 추출하세요.

- companyName: 발신 기업명. 알 수 없으면 null.
- stepName: 이 이메일과 관련된 전형 단계 이름. 다음 기본 전형 중 의미가 같은 것이 있으면 그 이름을 그대로 사용하세요: ${stepNameList}. 해당하지 않으면 이메일 내용에 맞는 새 이름을 만드세요. 알 수 없으면 null.
- resultOption: 이 전형 단계의 결과 상태. 다음 중 하나를 반드시 선택하세요.
  - "passed": 합격/통과했다는 표현이 명확히 있는 경우 (예: 合格, 通過, 次の選考へ, 次回選考のご案内, 합격, 통과, 다음 전형).
  - "failed": 불합격/탈락했다는 표현이 명확히 있는 경우 (예: 不合格, 見送り, 選考終了, 採用を見送る, 불합격, 탈락, 전형 종료).
  - "withdrawn": 지원자 본인이 지원을 스스로 취소·사퇴한다는 내용인 경우.
  - "inProgress": 위 세 가지에 해당하는 명확한 표현이 없는 경우(단순 안내, 일정 통보, 결과 대기 등). 애매하면 반드시 이 값을 사용하세요.
  이메일에 합격/불합격 결과가 명확한 문장으로 적혀 있으면 절대 "inProgress"로 두지 말고 반드시 "passed" 또는 "failed"로 판단하세요. 단, "결과", "면접", "선고/選考" 같은 단어가 있다는 것만으로는 판단하지 말고, 실제로 결과를 알리는 문장이 있을 때만 판단하세요.
- events: 이 이메일에 포함된 일정을 모두 배열로 추출하세요. 각 항목은 다음 중 하나의 eventType을 가집니다.
  - "schedule": 설명회, 면접 등 특정 일시에 진행되는 일정. startsAt을 채우고, 알 수 있으면 endsAt/location/onlineUrl도 채우세요.
  - "deadline": ES 제출, 응시 마감 등. dueAt을 채우고, 제출 링크가 있으면 onlineUrl도 채우세요.
  - "result_announcement": 결과 발표 예정. dueAt을 채우고, 결과 확인 링크가 있으면 onlineUrl도 채우세요.
  날짜/시간은 지금을 ${nowIso} (ISO 8601, 한국 표준시)로 간주하고, 상대적 표현("내일", "다음 주 금요일" 등)을 절대 ISO 8601 시각으로 변환하세요. 시각을 알 수 없는 필드는 null로 두세요.
  이메일에 일정 정보가 전혀 없으면 빈 배열을 반환하세요.
- contacts: 이메일에 언급된 담당자(발신자, 채용 담당자, 인사 담당자 등)를 모두 배열로 추출하세요. 담당자가 여러 명이면 모두 각각의 항목으로 만드세요. 각 항목마다 이름/이메일/전화번호/소속(부서·직책)을 채우세요. 이름을 알 수 없는 사람은 포함하지 마세요. 담당자 정보가 전혀 없으면 빈 배열을 반환하세요.
- memo: 이메일 원문을 그대로 옮기거나 길게 요약하지 마세요. 사용자가 실제로 해야 할 일(준비물, 제출해야 할 것 등)과 주의사항 중심으로 짧게 정리하세요. 항목이 여러 개면 줄마다 "- "로 시작하는 짧은 문장으로 나열하세요. companyName/stepName/events/contacts에 이미 담기는 정보(기업명, 전형 단계, 일정 날짜·장소·링크, 담당자 이름·연락처)는 memo에 반복해서 적지 마세요. 정리할 내용이 없으면 null.

이메일에 없는 정보를 추측해서 만들어내지 마세요. 확실하지 않으면 null을 사용하세요.`;

  const user = `--- 이메일 원문 ---\n${emailText}`;

  return { system, user };
}

// LLM이 명확한 합격/불합격 문구가 있는데도 종종 "inProgress"를 반환하는 문제를 보정하기 위한
// 결정적(deterministic) 후처리. "結果"・"面接"・"選考" 같은 일반 단어만으로는 판정하지 않고,
// 실제로 결과를 알리는 표현이 이메일 원문에 있을 때만 적용한다. 한 쪽 표현만 있으면 그 결과로
// 덮어쓰고, 양쪽이 다 있거나 둘 다 없으면(애매하면) LLM이 반환한 값을 그대로 유지한다.
// withdrawn은 이 후처리의 대상이 아니다(LLM이 withdrawn으로 판단했으면 그대로 둔다).
const PASSED_KEYWORDS = ["合格", "通過", "次の選考へ", "次回選考のご案内", "합격", "통과", "다음 전형"];
const FAILED_KEYWORDS = ["不合格", "見送り", "選考終了", "採用を見送る", "불합격", "탈락", "전형 종료"];

function resolveResultOption(
  llmValue: EmailAnalysisResultOption,
  emailText: string
): EmailAnalysisResultOption {
  if (llmValue === "withdrawn") return llmValue;

  const hasPassedKeyword = PASSED_KEYWORDS.some((keyword) => emailText.includes(keyword));
  const hasFailedKeyword = FAILED_KEYWORDS.some((keyword) => emailText.includes(keyword));

  if (hasPassedKeyword && !hasFailedKeyword) return "passed";
  if (hasFailedKeyword && !hasPassedKeyword) return "failed";
  return llmValue;
}

// OpenAI 응답(구조화 출력)을 최소한으로 검증해 안전한 형태로 변환한다. 별도 검증 라이브러리는 쓰지 않는다.
// emailText는 resolveResultOption의 결정적 후처리에 쓰인다.
export function parseEmailAnalysisResult(raw: unknown, emailText: string): EmailAnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("분석 결과 형식이 올바르지 않습니다.");
  }

  const obj = raw as Record<string, unknown>;

  const toNullableString = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const events: ExtractedEvent[] = Array.isArray(obj.events)
    ? obj.events
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          eventType: EXTRACTED_EVENT_TYPES.includes(item.eventType as ExtractedEventType)
            ? (item.eventType as ExtractedEventType)
            : "schedule",
          title: typeof item.title === "string" ? item.title.trim() : "",
          startsAt: toNullableString(item.startsAt),
          endsAt: toNullableString(item.endsAt),
          dueAt: toNullableString(item.dueAt),
          location: toNullableString(item.location),
          onlineUrl: toNullableString(item.onlineUrl),
          memo: toNullableString(item.memo),
        }))
    : [];

  const contacts: ExtractedContact[] = Array.isArray(obj.contacts)
    ? obj.contacts
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          name: typeof item.name === "string" ? item.name.trim() : "",
          email: toNullableString(item.email),
          phone: toNullableString(item.phone),
          role: toNullableString(item.role),
        }))
        .filter((contact) => contact.name)
    : [];

  const llmResultOption: EmailAnalysisResultOption = RESULT_OPTIONS.includes(
    obj.resultOption as EmailAnalysisResultOption
  )
    ? (obj.resultOption as EmailAnalysisResultOption)
    : "inProgress";

  return {
    companyName: toNullableString(obj.companyName),
    stepName: toNullableString(obj.stepName),
    resultOption: resolveResultOption(llmResultOption, emailText),
    events,
    contacts,
    memo: toNullableString(obj.memo),
  };
}
