# 시스템 구조

## 전체 구조

별도 백엔드 서버 없이, 브라우저가 Supabase와 대부분 직접 통신합니다. 인증이 필요하거나
서버 전용 키(OpenAI/Resend/service role)를 써야 하는 일부 기능만 Next.js API Routes를
거칩니다.

```text
사용자 브라우저
  ↓
Next.js Frontend
  ↓
Supabase(PostgreSQL + Auth) — 기업/전형/일정 등 대부분의 CRUD는 브라우저에서 직접 통신
```

```text
Next.js API Routes
  /api/ai/analyze-email  → OpenAI
  /api/account/delete    → Supabase(service role)
  /api/contact           → Resend
```

배포 구조:

```text
Next.js(Frontend + API Routes) → Vercel
Database/Auth → Supabase
```

## 기술별 역할

### Next.js
- 웹 화면
- 페이지 라우팅
- 사용자 입력
- 데이터 표시
- 반응형 UI
- Supabase와 직접 통신 + 일부 기능은 자체 API Routes

### Next.js API Routes
- `/api/ai/analyze-email`: 로그인 사용자의 AI 메일 분석 요청 처리(OpenAI 호출)
- `/api/account/delete`: 현재 세션 사용자 본인의 계정 삭제(Supabase service role)
- `/api/contact`: 비로그인 사용자도 이용 가능한 문의 폼 발송(Resend)

### Supabase
- PostgreSQL 데이터베이스
- 회원가입과 로그인
- Row Level Security

### 모바일 확장

웹 MVP 이후 모바일 앱은 동일한 Supabase 데이터베이스와 필요한 경우 동일한 Next.js API
Routes를 사용합니다.

```text
React Native / Expo
  ↓
동일한 Supabase Database(+ 필요 시 동일한 Next.js API Routes)
```
