-- application_steps.step_key: 기본 8단계를 UI 언어에 따라 번역 표시하기 위한 식별자.
-- null이면 사용자가 직접 추가했거나 기본 단계 이름을 수정한 것이므로, 화면에서는
-- 항상 name(사용자가 입력한 문자열)을 그대로 보여준다.
alter table public.application_steps
  add column if not exists step_key text;

-- 기업 생성 시 기본 8개 전형을 자동 생성하는 트리거 함수: name과 함께 step_key도 채운다.
create or replace function public.create_default_application_steps()
returns trigger
language plpgsql
as $$
begin
  insert into public.application_steps (user_id, company_id, name, step_order, step_status, step_key)
  values
    (new.user_id, new.id, '엔트리', 1, 'waiting', 'entry'),
    (new.user_id, new.id, '설명회', 2, 'waiting', 'briefing'),
    (new.user_id, new.id, 'ES', 3, 'waiting', 'es'),
    (new.user_id, new.id, 'Web 테스트', 4, 'waiting', 'web_test'),
    (new.user_id, new.id, '코딩 테스트', 5, 'waiting', 'coding_test'),
    (new.user_id, new.id, '1차 면접', 6, 'waiting', 'interview_1'),
    (new.user_id, new.id, '2차 면접', 7, 'waiting', 'interview_2'),
    (new.user_id, new.id, '최종 면접', 8, 'waiting', 'interview_final');
  return new;
end;
$$;

-- 기존 데이터 백필: 현재 name이 기본 8단계 한국어 이름과 정확히 일치하는 행만 step_key를 채운다.
-- 사용자가 이미 이름을 바꿨거나 직접 추가한 단계는 이름이 다르므로 매칭되지 않아 null로 남는다.
update public.application_steps as steps
set step_key = defaults.step_key
from (
  values
    ('엔트리', 'entry'),
    ('설명회', 'briefing'),
    ('ES', 'es'),
    ('Web 테스트', 'web_test'),
    ('코딩 테스트', 'coding_test'),
    ('1차 면접', 'interview_1'),
    ('2차 면접', 'interview_2'),
    ('최종 면접', 'interview_final')
) as defaults(name, step_key)
where steps.name = defaults.name
  and steps.step_key is null;
