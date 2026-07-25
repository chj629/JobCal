# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 프로젝트 개요

프로젝트명은 `JobCal`이다.

JobCal는 일본 취업을 준비하는 사용자가 30~100개 이상의 지원 기업, 전형 단계, 일정, 마이페이지 정보, 담당자 정보, 메모를 한곳에서 관리할 수 있도록 돕는 취업 활동 관리 서비스다.

현재는 웹 서비스를 먼저 개발하고, 웹 MVP가 안정된 이후 모바일 앱으로 확장한다.

## 핵심 목표

1. Excel, Notion, 메모장을 대신할 수 있는 웹 기반 취업 관리 서비스를 만든다.
2. 100개 이상의 지원 기업도 빠르게 관리할 수 있게 한다.
3. 중요한 일정과 결과 발표일을 놓치지 않게 한다.
4. 복잡한 AI 기능보다 쉽고 빠른 수동 관리 경험을 먼저 완성한다.
5. AI 자동화는 MVP 이후 단계적으로 추가한다.

## 개발 우선순위

1. 웹 MVP
2. 사용자 인증
3. 기업 CRUD
4. 전형 단계 관리
5. 일정 관리
6. 마이페이지 정보 관리
7. 담당자 및 메모 관리
8. 대시보드
9. AI 메일 분석
10. 모바일 앱

## 기술 스택

### Frontend
- React
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript

### Database
- Supabase PostgreSQL

### Authentication
- Supabase Auth

### Hosting
- Vercel: Frontend
- Render: Backend

### AI
- OpenAI API

### Mobile
- React Native
- Expo
- 웹 MVP 이후 개발

## 개발 원칙

- 초보 개발자가 이해할 수 있는 단순한 구조를 유지한다.
- 한 번에 하나의 작은 기능을 구현한다.
- 요청받지 않은 기능을 추가하지 않는다.
- 기존 기술로 해결할 수 있다면 새로운 라이브러리를 추가하지 않는다.
- 코드 작성 전 무엇을 변경하는지 짧게 설명한다.
- 코드 작성 후 실행 또는 테스트 방법을 설명한다.
- 검증하지 못한 기능을 완료했다고 말하지 않는다.
- UI 작업 전 `docs/project.md`의 디자인 시스템을 확인한다.

## MVP 포함 범위

- 회원가입 및 로그인
- 기업 추가, 조회, 수정, 삭제
- 기업 검색 및 정렬
- 우선순위 설정
- 기업 전체 상태 관리
- 전형 단계 관리
- 일정 및 결과 발표 예정일 관리
- 대시보드
- 마이페이지 정보 관리
- 담당자 정보 관리
- 메모 관리
- 반응형 웹

## MVP 제외 범위

- AI 메일 분석
- Gmail 및 Outlook 연동
- 자동 단계 변경
- 자동 일정 생성
- 푸시 알림
- 모바일 앱
- 결제
- 고급 통계
- 외부 캘린더 연동

## 보안 원칙

- 비밀번호와 API 키를 코드에 직접 작성하지 않는다.
- 비밀값은 환경변수로 관리한다.
- `.env` 파일은 Git에 커밋하지 않는다.
- 사용자별 데이터 접근을 분리한다.
- Supabase Row Level Security를 사용한다.
- 로그에 비밀번호, 토큰, 개인정보를 출력하지 않는다.
- 마이페이지 비밀번호는 평문으로 저장하지 않는다.
- 마이페이지 비밀번호 저장 방식은 구현 전에 별도 검토한다.

## 문서 확인 규칙

- 제품 목적, 기능, 화면: `docs/project.md`
- 개발 순서와 MVP 범위: `docs/roadmap.md`
- 전체 시스템 구조: `docs/architecture.md`
- 테이블, 컬럼, 관계, RLS: `docs/database.md`
- 프론트엔드와 백엔드 요청 방식: `docs/api.md`
- UI를 구현하거나 수정하기 전에 반드시 `docs/design.md`를 먼저 확인한다.

문서와 코드가 다르면 임의로 판단하지 말고 차이를 먼저 알린다.
