# 데이터베이스 설계

## 테이블 목록

1. `companies`
2. `application_steps`
3. `events`
4. `company_contacts`
5. `company_credentials`
6. `company_notes`
7. `next_actions`
8. `task_completions`(레거시, 아래 설명 참고)
9. `event_completions`
10. `ai_analysis_usage`

별도 `profiles` 테이블은 없습니다. 이메일/표시 이름(display_name)은 Supabase Auth의
`user_metadata`에 저장됩니다(`app/signup/page.tsx`의 `signUp({ options: { data: {
display_name } } })`, `app/(app)/settings/page.tsx`의 `updateUser`).

---

## companies

기업 자체의 기본 정보와 전체 결과를 저장합니다.

- id
- user_id
- name
- overall_status
- priority
- website_url
- mypage_url
- selection_memo
- location
- industry
- source
- position
- created_at
- updated_at

`selection_memo`는 기업당 하나만 존재하는 자유 메모입니다. 여러 개를 등록할 수 있는
`company_notes`와는 별개입니다. 기존 기업은 값이 없어 `null`을 허용합니다.

`location`(勤務地), `industry`(業界), `source`(応募経路), `position`(応募職種)은
Company Detail의 "企業情報" 카드에서 사용하는 자유 입력 필드입니다. 기존 기업은
값이 없어 `null`을 허용합니다.

### overall_status

- `in_progress`: 진행 중
- `offer`: 내정
- `joined`: 입사
- `rejected`: 불합격
- `cancelled`: 지원 취소

### priority

- `high`: 높음
- `medium`: 보통
- `low`: 낮음

현재 전형은 `companies` 테이블에 직접 저장하지 않습니다.

해당 기업의 `application_steps` 중 다음 순서로 계산합니다.

1. `step_status`가 `in_progress`인 전형이 있으면 그 전형.
2. 없고 `failed`인 전형이 있으면 그 전형(진행이 멈춘 상태).
3. 둘 다 없으면(전부 `passed`) `step_order`가 가장 마지막인 전형.
4. 전형이 하나도 없으면 없음(null).

---

## application_steps

기업별 전형 단계와 진행 상태를 저장합니다.

- id
- user_id
- company_id
- name
- step_order
- step_status
- created_at
- updated_at

### 기본 전형

기업 생성 시 다음 전형을 기본으로 생성합니다.

1. 엔트리
2. 설명회
3. ES
4. Web 테스트
5. 코딩 테스트
6. 1차 면접
7. 2차 면접
8. 최종 면접

사용자는 기업별로 전형을 추가, 삭제, 이름 변경, 순서 변경할 수 있습니다.

### step_status

- `waiting`: 대기(시스템이 캐스케이드 규칙에 따라 자동으로만 부여, 사용자가 직접 선택 불가)
- `in_progress`: 진행 중
- `passed`: 통과
- `failed`: 불합격

`waiting`을 제외한 세 가지(`in_progress`/`passed`/`failed`) 중에서만 사용자가 직접 선택할 수 있습니다.

상태를 바꾸면 캐스케이드 규칙이 함께 적용됩니다.

- 뒤(step_order가 큰) 전형은 모두 `waiting`으로 초기화됩니다.
- `passed`로 바꾸면 방금 `waiting`이 된 전형 중 가장 앞선 것 하나가 `in_progress`로 승격됩니다.
- 기업당 `in_progress`는 항상 0개 또는 1개입니다(다른 전형을 `in_progress`로 바꾸면 기존 `in_progress` 전형은 `waiting`으로 되돌아갑니다).

---

## events

전형과 관련된 일정, 마감일, 결과 발표 예정일을 저장합니다.

- id
- user_id
- company_id
- application_step_id
- event_type
- title
- starts_at
- ends_at
- due_at
- location
- online_url
- memo
- created_at
- updated_at

### event_type

- `schedule`: 설명회, 면접 등 특정 일시에 진행되는 일정
- `deadline`: ES, Web 테스트 등의 마감
- `result_announcement`: 결과 발표 예정

### 필드 사용 규칙

#### 일정

- `starts_at`: 시작 날짜와 시간
- `ends_at`: 종료 날짜와 시간
- `location`: 오프라인 장소
- `online_url`: 온라인 참가 링크

#### 마감

- `due_at`: 제출 또는 응시 마감 날짜와 시간
- `online_url`: 제출 링크 (선택)

#### 결과 발표

- `due_at`: 결과 발표 예정 날짜와 시간
- `online_url`: 결과 확인 링크 (선택)

사용하지 않는 필드는 `null`로 저장합니다. `online_url`은 예외적으로 모든 `event_type`에서 사용할 수 있습니다.

하나의 전형에는 여러 개의 일정을 등록할 수 있습니다.

예:

- 설명회 참가 일정
- ES 제출 마감
- 1차 면접 일정
- 1차 면접 결과 발표 예정일

---

## 다음 일정 계산

기업 목록의 `다음 일정`은 해당 기업에 연결된 모든 미래 `events` 중
현재 시각과 가장 가까운 일정 하나를 표시합니다.

비교 대상은 다음과 같습니다.

- `starts_at`
- `due_at`

과거 일정은 제외합니다.

같은 시각의 일정이 여러 개라면 다음 우선순위를 사용합니다.

1. `deadline`
2. `schedule`
3. `result_announcement`

---

## company_contacts

기업 담당자 정보를 저장합니다.

- id
- user_id
- company_id
- name
- email
- phone
- role
- memo
- created_at
- updated_at

---

## company_credentials

기업 마이페이지 로그인 정보를 저장합니다.

- id
- user_id
- company_id
- login_url
- login_id
- encrypted_password
- login_memo
- created_at
- updated_at

마이페이지 비밀번호는 평문으로 저장하지 않습니다.

암호화 방식이 확정되기 전까지 비밀번호 저장 기능은 구현하지 않을 수 있습니다.
현재 `encrypted_password`는 컬럼만 존재하고 앱에서 채우지 않습니다.

`company_id`에 unique 제약이 있어 기업당 최대 1건만 존재합니다.

`login_url`은 companies.mypage_url과 별개로 설계되어 있지만, Company Detail의
"マイページ情報" 카드는 URL을 companies.mypage_url에 저장하므로 현재 앱은
`login_url`을 채우지 않습니다.

---

## company_notes

기업별 자유 메모를 저장합니다.

- id
- user_id
- company_id
- title
- content
- created_at
- updated_at

---

## next_actions

Company Detail "次のアクション" 카드의 자유 형식 할일 목록을 저장합니다.

- id
- user_id
- company_id
- text
- due_label
- done
- created_at
- updated_at

`due_label`은 현재 UI에서 표시/입력하지 않는 필드로, 항상 빈 문자열입니다.

---

## task_completions (레거시)

Dashboard "오늘 해야 할 일"의 과거 체크 상태 저장 테이블(기업+날짜 단위)입니다.
`event_completions`(이벤트 단위)로 대체되어 더 이상 새로 쓰이지 않지만, 과거 체크 기록을
새 이벤트에 신뢰성 있게 매핑할 방법이 없어 테이블 자체는 삭제하지 않고 남아 있습니다.

- id
- user_id
- company_id
- schedule_date
- created_at

---

## event_completions

Dashboard "오늘 해야 할 일"의 현재 체크 상태 저장 테이블(이벤트 단위)입니다.

- id
- user_id
- event_id
- created_at

---

## ai_analysis_usage

`/api/ai/analyze-email`(AI 메일 분석)의 사용자별 일일 호출 횟수를 기록해 OpenAI 비용
남용을 방지합니다. 이메일 원문은 저장하지 않고 호출 횟수만 저장합니다.

- id
- user_id
- usage_date
- call_count
- created_at
- updated_at

`increment_ai_analysis_usage(p_usage_date)` 함수(SECURITY DEFINER)가 `auth.uid()` 기준으로만
원자적으로 카운트를 증가시키며, Route Handler가 반환된 횟수를 보고 일일 한도 초과 여부를
판정합니다.

---

## 삭제 규칙

기업이 삭제되면 해당 기업과 연결된 데이터도 함께 삭제합니다.

- `application_steps`
- `events`
- `company_contacts`
- `company_credentials`
- `company_notes`
- `next_actions`

외래 키에는 `ON DELETE CASCADE`를 적용합니다.

전형이 삭제되면 해당 전형과 연결된 `events`도 함께 삭제합니다.

---

## 보안

모든 사용자 데이터는 사용자별로 분리합니다.

```text
auth.uid() = user_id
```

마이페이지 비밀번호는 평문으로 저장하지 않습니다.
