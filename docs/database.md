# 데이터베이스 설계

## 테이블 목록

1. `profiles`
2. `companies`
3. `application_steps`
4. `events`
5. `company_contacts`
6. `company_credentials`
7. `company_notes`

## companies

- id
- user_id
- name
- overall_status
- priority
- current_step_id
- website_url
- created_at
- updated_at

## application_steps

- id
- user_id
- company_id
- step_type
- step_order
- step_status
- scheduled_at
- result_expected_at
- memo
- created_at
- updated_at

## events

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

## company_contacts

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

## company_credentials

- id
- user_id
- company_id
- login_url
- login_id
- encrypted_password
- login_memo
- created_at
- updated_at

## company_notes

- id
- user_id
- company_id
- title
- content
- created_at
- updated_at

## 보안

모든 사용자 데이터는 다음 조건으로 분리합니다.

```text
auth.uid() = user_id
```

마이페이지 비밀번호는 평문으로 저장하지 않습니다.
