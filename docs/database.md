# 데이터베이스 설계

## 테이블 목록

1. `profiles`
2. `companies`
3. `application_steps`
4. `events`
5. `company_contacts`
6. `company_credentials`
7. `company_notes`
8. `next_actions`

---

## profiles

- id
- email
- display_name
- created_at
- updated_at

---

## companies

기업 자체의 기본 정보와 전체 결과를 저장합니다.

- id
- user_id
- name
- overall_status
- priority
- website_url
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

해당 기업의 `application_steps` 중 `step_order`가 가장 앞서면서
`step_status`가 `completed`가 아닌 전형을 현재 전형으로 계산합니다.

모든 전형이 완료된 경우에는 가장 마지막 전형을 현재 전형으로 표시합니다.

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

- `waiting`: 대기
- `action_required`: 해야 함
- `scheduled`: 일정 확정
- `completed`: 완료

전형 종류에 따른 상태 전이 제한은 두지 않습니다.

사용자가 네 가지 상태 중 하나를 자유롭게 선택할 수 있습니다.

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
