import { getDefaultStepNames, matchDefaultStepKey } from "@/lib/applicationSteps";
import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/messages";

// docs/database.md: events.event_type
export type ExtractedEventType = "schedule" | "deadline" | "result_announcement";

const EXTRACTED_EVENT_TYPES: ExtractedEventType[] = ["schedule", "deadline", "result_announcement"];

// components/companies/EmailAnalysisReview.tsx의 RESULT_OPTION_KEYS와 동일한 4개 값.
export type EmailAnalysisResultOption = "inProgress" | "passed" | "failed" | "withdrawn";

const RESULT_OPTIONS: EmailAnalysisResultOption[] = ["inProgress", "passed", "failed", "withdrawn"];

export interface StepUpdate {
  stepName: string;
  resultOption: EmailAnalysisResultOption;
}

export interface ExtractedEvent {
  eventType: ExtractedEventType;
  title: string;
  stepName: string | null;
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
  stepUpdates: StepUpdate[];
  /** @deprecated Derived from stepUpdates for the current review/registration UI. */
  stepName: string | null;
  /** @deprecated Derived from stepUpdates for the current review/registration UI. */
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
    required: ["companyName", "stepUpdates", "events", "contacts", "memo"],
    properties: {
      companyName: { type: ["string", "null"] },
      stepUpdates: {
        type: "array",
        description:
          "현재 지원자에게 확정된 전형 결과뿐 아니라, 지금 제출·응시·참여·일정 조정 등 실제 행동이 요구된 전형도 inProgress로 포함한다. 일반적인 제도 설명과 조건부 미래 절차는 포함하지 않는다.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["stepName", "resultOption"],
          properties: {
            stepName: {
              type: "string",
              description: "상태 변경 또는 현재 행동 요구가 직접 귀속되는 전형명",
            },
            resultOption: {
              type: "string",
              enum: RESULT_OPTIONS,
              description:
                "현재 지원자가 그 전형을 수행해야 하면 inProgress, 확정 결과가 있으면 passed/failed/withdrawn",
            },
          },
        },
      },
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "eventType",
            "title",
            "stepName",
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
            stepName: { type: ["string", "null"] },
            startsAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 timestamp. 원문에 timezone이 없으면 Asia/Tokyo 현지 시각으로 해석하고 +09:00 offset을 포함한다.",
            },
            endsAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 timestamp. 원문에 timezone이 없으면 Asia/Tokyo 현지 시각으로 해석하고 +09:00 offset을 포함한다.",
            },
            dueAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 timestamp. 원문에 timezone이 없으면 Asia/Tokyo 현지 시각으로 해석하고 +09:00 offset을 포함한다.",
            },
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

// 이메일 원문과 서버 기준 현재 시각, 그리고 JobCal의 현재 언어(locale)를 받아 OpenAI Chat
// Completions에 보낼 system/user 메시지를 만든다. locale은 이 함수가 새로 작성하는 자연어
// 필드(memo 등)의 출력 언어와, stepUpdates의 기본 전형이 매칭됐을 때 어떤 언어의 정규 표시명을
// 참조 목록으로 줄지에만 쓰인다 — 이메일 원문에서 그대로 추출하는 고유 데이터(기업명, 담당자
// 이름, URL, 커스텀 전형명 등)의 언어는 이 값과 무관하게 원문 그대로 유지된다.
export function buildEmailAnalysisPrompt(emailText: string, nowIso: string, locale: Locale) {
  const stepNameList = getDefaultStepNames(locale).join(", ");
  const outputLanguageLabel = locale === "ko" ? "한국어" : "일본어";

  const system = `당신은 일본 취업 활동 이메일에서 정보를 추출하는 도우미입니다.
사용자가 붙여넣은 채용 관련 이메일 원문을 분석해 아래 항목을 JSON으로 추출하세요.

[언어 규칙]
- 이메일 내용을 바탕으로 당신이 새로 문장을 작성하는 자연어 설명 항목(현재는 memo)은 반드시 ${outputLanguageLabel}만 사용하고 다른 언어를 섞지 마세요. 앞으로 이런 자연어 설명 항목이 추가되더라도 항상 이 규칙을 적용하세요.
- 반면 아래 항목은 당신이 새로 작성하는 문장이 아니라 이메일 원문에서 그대로 추출하는 고유 데이터이므로 이 규칙의 대상이 아닙니다. 다른 언어로 번역하지 말고 이메일에 쓰인 표현을 그대로 사용하세요: companyName, contacts의 이름, events의 location/onlineUrl, 기본 전형과 매칭되지 않는 stepUpdates[].stepName 및 events[].stepName, 그 외 이메일에 등장하는 고유명사 전반.
- 이 문서 안의 일본어 예시 문장들은 이메일 문장 구조·관계를 설명하기 위한 것일 뿐, 출력 언어 예시가 아닙니다. 출력 언어는 오직 위 규칙만 따르세요.

- companyName: 발신 기업명. 알 수 없으면 null.
- stepUpdates: 이 이메일로 실제 상태가 확정적으로 확인되는 모든 전형 단계를 배열에 담으세요. 각 항목은 stepName과 resultOption을 가집니다. 예를 들어 "서류 통과 + 다음 1차 면접 실시 안내"라면 서류/passed와 1차 면접/inProgress를 둘 다, "1차 면접 통과 + 다음 2차 면접 실시 안내"라면 1차 면접/passed와 2차 면접/inProgress를 둘 다 담으세요. 확인되는 전형 상태가 없으면 빈 배열을 반환하세요.
  - stepName: 해당 상태가 가리키는 전형명입니다. 다음 기본 전형 중 의미가 같은 것이 있으면 그 이름을 그대로 사용하세요(이 목록 자체가 이미 ${outputLanguageLabel} 정규 표기입니다): ${stepNameList}. 해당하지 않으면(예: AI一次面接, カジュアル面談) 이메일 원문 표현을 번역하거나 새로 이름 짓지 말고 그대로 사용하세요.
  - resultOption은 반드시 그 항목의 stepName 단계 자체에 대한 상태여야 하며, 다른 단계의 결과를 옮겨오면 안 됩니다.
  - "passed": 해당 단계 자체의 합격/통과가 명확한 경우 (예: 合格, 通過, 합격, 통과).
  - "failed": 해당 단계 자체의 불합격/탈락이 명확한 경우 (예: 不合格, 見送り, 選考終了, 採用を見送る, 불합격, 탈락, 전형 종료).
  - "withdrawn": 지원자 본인이 지원을 스스로 취소·사퇴한다는 내용인 경우.
  - "inProgress": 해당 단계의 실제 실시·응시·일정 조정·참여가 현재 지원자에게 확정적으로 안내된 경우입니다. 아직 실시되지 않은 다음 단계 안내도 여기에 해당합니다.
  - 현재 지원자에게 어떤 전형의 제출·접수·응시·참가·예약·일정 조정 등 실제 행동을 직접 요구하거나 초대하는 문장은 그 전형의 "inProgress"를 반드시 생성하세요. 날짜가 아직 없거나 단순 URL/마감만 함께 있어도 동일합니다. 이것은 단순 절차 설명이 아니라 현재 지원자의 전형이 시작되었다는 확정 안내입니다.
  - 예: "エントリーシートを○月○日までに提出してください" → ES/inProgress, "Webテストを受検してください" → Webテスト/inProgress, "一次面接にご参加ください" 또는 현재 지원자의 면접 일정을 제시·조정하는 안내 → 一次面接/inProgress.
  - events에 현재 지원자가 수행해야 하는 schedule/deadline을 추출했고 그 event.stepName이 명확하다면, 같은 전형의 확정 결과(passed/failed/withdrawn)가 별도로 명시되지 않은 한 해당 전형의 inProgress가 stepUpdates에도 있어야 합니다. event만 만들고 현재 행동 대상 전형의 stepUpdate를 누락하지 마세요.
  이메일에 합격/불합격 결과가 명확하면 그 단계는 절대 "inProgress"로 두지 마세요. 단순히 "결과", "면접", "選考" 같은 단어가 있거나, 지원자에게 지금 어떤 행동도 요구하지 않는 일반적인 전형 제도·순서 설명만으로는 update를 만들지 마세요. 특히 "AI一次面接を通過された方にはウェルカム面談を予定しています" 또는 "ES提出者には後日面接をご案内します"처럼 가정·조건부로 미래 절차를 설명한 문장은 현재 지원자의 앞 단계 통과도, 뒤 단계 진행도 확정하지 않으므로 어느 쪽도 stepUpdates에 넣으면 안 됩니다. 각 문장의 대상이 현재 지원자이고 지금 상태나 행동이 실제 확정되었는지 문장 관계로 판단하세요.
- events: 이 이메일에 포함된 일정을 모두 배열로 추출하세요. 각 항목은 다음 중 하나의 eventType을 가집니다.
  - "schedule": 설명회, 면접 등 특정 일시에 진행되는 일정. startsAt을 채우고, 알 수 있으면 endsAt/location/onlineUrl도 채우세요.
  - "deadline": ES 제출, 응시 마감 등. dueAt을 채우고, 제출 링크가 있으면 onlineUrl도 채우세요.
  - "result_announcement": 결과 발표 예정. dueAt을 채우고, 결과 확인 링크가 있으면 onlineUrl도 채우세요.
  - stepName: 이메일 문맥상 이 일정이 특정 전형에 속한다는 것이 명확하면 그 전형명을 넣으세요. 기본 전형과 의미가 같으면 위 기본 전형 목록의 ${outputLanguageLabel} 정규 표기를 사용하고, 커스텀 전형이면 원문 표현을 유지하세요. 일정 제목이 전형명처럼 보인다는 이유로 title을 그대로 복사하지 말고, 본문에서 일정과 전형의 귀속 관계가 명확할 때만 넣으세요. 어느 전형 일정인지 불명확한 일반 일정이면 null로 두세요.
  예: "一次面接を通過しました。二次面接は9月3日14時から実施します"의 일정 stepName은 二次面接입니다. 설명회 실시 일정을 명확히 안내하면 説明会이고, "当日の予定"처럼 어느 전형인지 특정할 수 없는 일정은 null입니다.
  날짜/시간은 지금을 ${nowIso} (ISO 8601, Asia/Tokyo)로 간주하고, 상대적 표현("내일", "다음 주 금요일" 등)을 절대 ISO 8601 시각으로 변환하세요.
  - 일본 취업 이메일의 날짜/시간에 timezone이 별도로 쓰이지 않았으면 Asia/Tokyo 현지 시각으로 해석하고, 반환 ISO 문자열에 반드시 +09:00 offset을 포함하세요. 예: 원문의 "2026年9月10日 23:59" → "2026-09-10T23:59:00+09:00". 같은 벽시계 값에 Z를 붙여 "2026-09-10T23:59:00Z"로 반환하면 안 됩니다.
  - 원문에 UTC, GMT, JST 또는 +09:00 같은 timezone/offset이 명시되어 있으면 그 실제 시각 의미를 그대로 보존하세요. 이미 offset이 있는 값을 다시 9시간 이동시키거나 중복 변환하지 마세요.
  시각을 알 수 없는 필드는 null로 두세요.
  이메일에 일정 정보가 전혀 없으면 빈 배열을 반환하세요.
- contacts: 이메일에 언급된 담당자(발신자, 채용 담당자, 인사 담당자 등)를 모두 배열로 추출하세요. 담당자가 여러 명이면 모두 각각의 항목으로 만드세요. 각 항목마다 이름/이메일/전화번호/소속(부서·직책)을 채우세요. 이름을 알 수 없는 사람은 포함하지 마세요. 담당자 정보가 전혀 없으면 빈 배열을 반환하세요.
- memo: 이메일 원문을 그대로 옮기거나 길게 요약하지 마세요. 사용자가 실제로 해야 할 일(준비물, 제출해야 할 것 등)과 주의사항 중심으로 짧게 정리하세요. 항목이 여러 개면 줄마다 "- "로 시작하는 짧은 문장으로 나열하세요. companyName/stepUpdates/events/contacts에 이미 담기는 정보(기업명, 전형 단계, 일정 날짜·장소·링크, 담당자 이름·연락처)는 memo에 반복해서 적지 마세요. 위 [언어 규칙]에 따라 ${outputLanguageLabel}로 작성하세요. 정리할 내용이 없으면 null.

이메일에 없는 정보를 추측해서 만들어내지 마세요. 확실하지 않으면 null을 사용하세요.

다시 한 번 강조합니다: memo는 반드시 ${outputLanguageLabel}만 사용하고 다른 언어를 섞지 마세요.`;

  const user = `--- 이메일 원문 ---\n${emailText}`;

  return { system, user };
}

// stepName이 기본 전형과 의미상 같으면(matchDefaultStepKey) 현재 locale의 정규 표시명으로
// 결정적으로 통일한다. 프롬프트로 "목록의 이름을 그대로 쓰라"고 안내해도 LLM이 종종 이메일
// 원문 언어를 그대로 남기거나(예: "説明会", "1次面接" 같은 표기) 지시를 놓치므로, LLM에게만
// 맡기지 않고 여기서 다시 한 번 결정적으로 맞춘다. matchDefaultStepKey는 8개 기본 전형의
// ko/ja 정규 표기와 정확히 일치할 때만 매칭하므로("AI一次面接", "カジュアル面談" 같은 커스텀
// 전형은 절대 매칭되지 않음) 커스텀 전형을 기본 전형으로 오인할 위험이 없고, 그 판단은 여기서
// 새로 만들지 않고 그대로 재사용한다. 매칭되지 않으면 원문을 그대로 둔다.
function normalizeStepName(rawStepName: string | null, locale: Locale): string | null {
  if (!rawStepName) return rawStepName;
  const stepKey = matchDefaultStepKey(rawStepName);
  return stepKey ? translate(locale, `applicationSteps.default.${stepKey}`) : rawStepName;
}

// Structured Output이어도 모델이 timezone suffix를 빠뜨릴 수 있다. 날짜+시각까지 있는 ISO
// 문자열에 offset이 없을 때만 일본 현지 시각(+09:00)을 보완한다. Z/+09:00/다른 offset이
// 이미 있거나 날짜만 있는 값은 실제 의미를 바꾸거나 기존 날짜-only 동작을 건드리지 않는다.
function normalizeExtractedDateTime(rawValue: string | null): string | null {
  if (!rawValue) return rawValue;
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawValue);
  if (hasExplicitOffset) return rawValue;
  const isIsoLocalDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(
    rawValue
  );
  return isIsoLocalDateTime ? `${rawValue}+09:00` : rawValue;
}

// OpenAI 응답(구조화 출력)을 최소한으로 검증해 안전한 형태로 변환한다. 별도 검증 라이브러리는 쓰지 않는다.
// locale은 각 stepUpdates[].stepName과 events[].stepName 정규화에 쓰인다.
// API 응답으로 나가기 직전인 여기 한 곳에서만 stepName을 정규화해, 리뷰 화면/저장 데이터가
// 서로 다른 이름을 보여주는 일이 없게 한다.
export function parseEmailAnalysisResult(
  raw: unknown,
  _emailText: string,
  locale: Locale
): EmailAnalysisResult {
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
          stepName: normalizeStepName(toNullableString(item.stepName), locale),
          startsAt: normalizeExtractedDateTime(toNullableString(item.startsAt)),
          endsAt: normalizeExtractedDateTime(toNullableString(item.endsAt)),
          dueAt: normalizeExtractedDateTime(toNullableString(item.dueAt)),
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

  const stepUpdates: StepUpdate[] = Array.isArray(obj.stepUpdates)
    ? obj.stepUpdates
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => {
          const stepName = normalizeStepName(toNullableString(item.stepName), locale);
          const resultOption: EmailAnalysisResultOption = RESULT_OPTIONS.includes(
            item.resultOption as EmailAnalysisResultOption
          )
            ? (item.resultOption as EmailAnalysisResultOption)
            : "inProgress";
          return stepName ? { stepName, resultOption } : null;
        })
        .filter((item): item is StepUpdate => item !== null)
    : [];

  // 기존 리뷰/등록 화면은 아직 단일 단계만 처리한다. 진행 중인 단계가 있으면 그것을 우선하고,
  // 없으면 이메일에 나타난 마지막 확정 업데이트를 사용한다. 아무 업데이트도 없으면 과거의
  // "단계 미상 + 진행 중" 안전 기본값과 동일하게 유지한다.
  const legacyStepUpdate =
    stepUpdates.find((stepUpdate) => stepUpdate.resultOption === "inProgress") ??
    stepUpdates[stepUpdates.length - 1];

  return {
    companyName: toNullableString(obj.companyName),
    stepUpdates,
    stepName: legacyStepUpdate?.stepName ?? null,
    resultOption: legacyStepUpdate?.resultOption ?? "inProgress",
    events,
    contacts,
    memo: toNullableString(obj.memo),
  };
}
