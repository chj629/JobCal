-- companies.next_schedule_time: 다음 일정의 시간(선택 입력, "HH:mm" 형식)
alter table public.companies
  add column if not exists next_schedule_time text;

alter table public.companies
  add constraint companies_next_schedule_time_format
  check (
    next_schedule_time is null
    or next_schedule_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );
