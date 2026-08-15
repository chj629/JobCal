-- Company Detail의 "選考メモ" 카드용 컬럼. company_notes(여러 개의 자유 메모 목록)와는
-- 별개로, 기업당 하나만 존재하는 단일 메모다. 기존 기업 데이터는 값이 없으므로 null을
-- 허용하고 별도 백필은 하지 않는다.
alter table public.companies
  add column if not exists selection_memo text;
