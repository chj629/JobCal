# 배포 후 개발 로드맵

> 2026-08 기준. MVP 배포 전 필수 수정(세션 만료 처리, 저장 중복 방지, auth/callback 오픈
> 리다이렉트 방어)은 완료되어 이 문서에서 제외했습니다. 아래는 배포 시점에 미해결 상태인
> 항목만 정리한 것입니다. 우선순위 기준: **P1** = 배포 직후 빠르게 수정, **P2** = 실제
> 사용자 피드백 후 개선, **P3** = 기능 확장 단계.

## P1 — 배포 직후 바로 처리

### 1. OpenAI timeout / Vercel maxDuration
- 현재 문제: `app/api/ai/analyze-email/route.ts`의 OpenAI 호출에 명시적 timeout이나 `maxDuration` 설정이 없어, 응답이 느리면 Vercel 서버리스 함수 실행시간 제한(플랜에 따라 기본 10초 등)에 걸려 504로 끊길 수 있음
- 우선순위: P1
- 수정 난이도: 낮음
- 추천 시점: 배포 직후
- [ ] 완료

### 2. company_credentials 동시 저장 race condition
- 현재 문제: `lib/company-credentials-context.tsx`의 `saveCredential`이 로컬 state에서 기존 행을 찾아 insert/update를 분기하는 방식이라, 거의 동시에 두 번 저장하면 둘 다 "기존 없음"으로 판단해 둘 다 insert를 시도 → `unique(company_id)` 위반으로 한쪽이 비정상 실패할 수 있음
- 우선순위: P1
- 수정 난이도: 낮음
- 추천 시점: 배포 직후
- [ ] 완료

### 3. Landing 실제 제품 스크린샷 교체
- 현재 문제: `components/landing/LandingHero.tsx`, `components/landing/LandingShowcase.tsx`가 실제 대시보드/AI 화면 대신 placeholder 아이콘만 표시 중
- 우선순위: P1
- 수정 난이도: 낮음(코드는 쉬움, 실제 스크린샷 에셋 준비가 필요)
- 추천 시점: 실사용자 유입 시작 전
- [ ] 완료

## P2 — 안정화 / 초기 사용자 피드백 후

### 4. API route 401 JSON 처리
- 현재 문제: `proxy.ts`의 matcher가 `/api/*`를 제외하지 않아, 미인증 상태로 API를 fetch하면 JSON 401 대신 HTML `/login` 리다이렉트가 반환됨(API route 자체의 내부 401 체크는 정상 동작해 실제 보안 문제는 아님)
- 우선순위: P2
- 수정 난이도: 낮음
- 추천 시점: 사용자 피드백 후
- [ ] 완료

### 5. user_id DB index 보강
- 현재 문제: `application_steps`, `events`, `company_notes`, `company_contacts`, `company_credentials`, `next_actions` 6개 테이블에 `user_id` 인덱스가 없음(companies/task_completions/event_completions에는 있음)
- 우선순위: P2
- 수정 난이도: 낮음
- 추천 시점: 사용자 수가 늘어나면
- [ ] 완료

### 6. docs/database.md 동기화
- 현재 문제: 테이블 목록에 `event_completions`/`task_completions` 누락, `company_notes.position` 컬럼 누락 등 실제 스키마와 문서가 어긋난 부분이 있음
- 우선순위: P2
- 수정 난이도: 낮음
- 추천 시점: 여유 있을 때
- [ ] 완료

### 7. 페이지별 metadata
- 현재 문제: `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/contact` 등이 모두 `app/layout.tsx`의 루트 `metadata`(title="JobCal")만 상속하고 페이지별 title/description이 없음
- 우선순위: P2
- 수정 난이도: 낮음
- 추천 시점: 여유 있을 때
- [ ] 완료

### 8. robots.txt / sitemap
- 현재 문제: `app/robots.ts`, `app/sitemap.ts` 등이 전혀 없음(대부분 로그인 후 화면이라 필수는 아니지만 크롤링 정책을 명시하는 것이 좋음)
- 우선순위: P2
- 수정 난이도: 낮음
- 추천 시점: 여유 있을 때
- [ ] 완료

### 9. Dashboard KPI 증감 정확도 개선
- 현재 문제: `app/(app)/dashboard/page.tsx`의 "+N" 증감 뱃지가 진짜 히스토리 트래킹이 아니라 `createdAt`/`updatedAt` 기반 근사치로 계산됨
- 우선순위: P2
- 수정 난이도: 중간(정확한 계산을 위해서는 히스토리 저장 구조가 필요)
- 추천 시점: 사용자 피드백 후
- [ ] 완료

### 10. task_completions / 죽은 companies 컬럼 정리
- 현재 문제: `task_completions` 테이블(0003 마이그레이션)이 `event_completions`로 완전히 대체되어 코드에서 미참조 상태로 확인됨. `companies.current_step`/`next_schedule`/`next_schedule_time`/`memo` 컬럼도 코드에서 미참조 상태로 확인됨. 둘 다 DROP은 하지 않은 상태
- 우선순위: P2
- 수정 난이도: 낮음(단, 컬럼/테이블 DROP은 신중하게 별도 마이그레이션으로 진행)
- 추천 시점: 서비스 안정화 후
- [ ] 완료

### 11. Settings 계정 삭제
- 현재 문제: `app/(app)/settings/page.tsx`의 "アカウント削除" 버튼이 안내 토스트만 띄우고 실제 삭제 로직이 없음
- 우선순위: P2
- 수정 난이도: 중간(서버 사이드 API route + service role key + 연관 데이터 cascade 삭제 필요)
- 추천 시점: 사용자 피드백 후
- [ ] 완료

## P3 — 기능 확장 단계

### 12. Dashboard 태블릿 breakpoint
- 현재 문제: `app/(app)/dashboard/page.tsx`에 `lg:` 브레이크포인트만 있고 태블릿 폭(`md:`) 대응이 없음
- 우선순위: P3
- 수정 난이도: 낮음
- 추천 시점: 여유 있을 때
- [ ] 완료

### 13. 次のアクション dueLabel
- 현재 문제: `next_actions.due_label` 컬럼은 존재하지만 UI에 입력/표시 자체가 없음(현재는 항상 빈 문자열)
- 우선순위: P3
- 수정 난이도: 낮음~중간
- 추천 시점: 기능 확장 단계
- [ ] 완료

### 14. AI Drawer 選考結果
- 현재 문제: `application_steps.step_status`(진행 상태만 표현)와 `companies.overall_status`(기업 전체 최종 결과) 어느 쪽도 "이 전형 하나의 합격/불합격"을 표현하지 못해, `resultOption`은 여전히 로컬 state로만 존재하고 저장되지 않음
- 우선순위: P3
- 수정 난이도: 중간(스키마 설계를 먼저 다시 검토해야 함)
- 추천 시점: 기능 확장 단계
- [ ] 완료

### 15. AI Drawer リマインダー
- 현재 문제: `reminderOption`이 여전히 로컬 state로만 존재하고 저장되지 않음. 알림을 실제로 보내려면 MVP 제외 범위인 푸시 알림 인프라가 필요
- 우선순위: P3
- 수정 난이도: 중간~높음(알림 인프라 필요)
- 추천 시점: 기능 확장 단계
- [ ] 완료

### 16. AI 기업명 매칭 고도화
- 현재 문제: 이메일에서 추출한 기업명과 기존 등록 기업을 연결하는 매칭 로직이 단순한 상태로, 개선 여지가 있음
- 우선순위: P3
- 수정 난이도: 중간
- 추천 시점: 기능 확장 단계
- [ ] 완료

### 17. マイページ 비밀번호 안전 저장
- 현재 문제: `company_credentials.encrypted_password` 컬럼은 존재하지만 암호화 방식이 확정되지 않아 어떤 코드 경로에서도 쓰이지 않음(비밀번호는 여전히 로컬 state 전용)
- 우선순위: P3
- 수정 난이도: 높음(암호화 방식 설계가 선결 과제)
- 추천 시점: 실제 사용자 요청이 생기면
- [ ] 완료

### 18. 숨겨둔 feature flag 기능
- 현재 문제: `SHOW_EXTRA_STATUS_TABS`, `SHOW_ADD_FROM_EMAIL_LINK`, `SHOW_PAGE_SIZE_SELECT`, `SHOW_EVENT_TYPE_LEGEND`, `SHOW_UPCOMING_SCHEDULE_PANEL`, `SHOW_EMAIL_HINT`, `SHOW_UPCOMING_EVENTS_CARD` 7개 모두 이미 정상 구현되어 있고 Stitch 디자인 기준으로만 숨겨진 상태(버그 아님)
- 우선순위: P3
- 수정 난이도: 매우 낮음(플래그 값 전환만 하면 됨)
- 추천 시점: 필요할 때 개별 활성화
- [ ] 완료
