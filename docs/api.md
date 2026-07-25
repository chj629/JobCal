# API 설계

## 기본 구조

```text
Next.js Frontend
  ↓ HTTP
Express API
  ↓
Supabase PostgreSQL
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

## 향후 AI API

- `POST /api/ai/analyze-email`
