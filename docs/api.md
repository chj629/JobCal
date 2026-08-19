# API 설계

## 기본 구조

별도 Express 백엔드는 없습니다. 기업/전형/일정/메모/담당자/마이페이지 등 대부분의 CRUD는
브라우저가 Supabase와 직접 통신합니다(아래 엔드포인트 목록은 과거 계획 당시의 설계이며,
실제로는 Supabase 클라이언트 SDK 호출로 대체되어 있습니다 — 재작성은 별도 작업으로 남깁니다).

```text
Next.js Frontend
  ↓
Supabase(PostgreSQL + Auth) — 브라우저에서 직접 통신
```

## 기업 API

- `GET /api/companies`
- `GET /api/companies/:companyId`
- `POST /api/companies`
- `PATCH /api/companies/:companyId`
- `DELETE /api/companies/:companyId`

## 전형 단계 API

- `GET /api/companies/:companyId/steps`
- `POST /api/companies/:companyId/steps`
- `PATCH /api/steps/:stepId`
- `DELETE /api/steps/:stepId`

## 일정 API

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`

## 대시보드 API

- `GET /api/dashboard`

## 마이페이지 API

- `GET /api/companies/:companyId/credentials`
- `PUT /api/companies/:companyId/credentials`

## 담당자 API

- `GET /api/companies/:companyId/contacts`
- `POST /api/companies/:companyId/contacts`
- `PATCH /api/contacts/:contactId`
- `DELETE /api/contacts/:contactId`

## 메모 API

- `GET /api/companies/:companyId/notes`
- `POST /api/companies/:companyId/notes`
- `PATCH /api/notes/:noteId`
- `DELETE /api/notes/:noteId`

## 실제 구현된 Next.js API Routes

위 목록과 달리, 아래 3개는 실제로 구현되어 있는 Next.js Route Handler입니다.

- `POST /api/ai/analyze-email`: 로그인 사용자의 AI 메일 분석(OpenAI 호출)
- `POST /api/account/delete`: 현재 세션 사용자 본인의 계정 삭제(Supabase service role)
- `POST /api/contact`: 비로그인 사용자도 이용 가능한 문의 폼 발송(Resend)
