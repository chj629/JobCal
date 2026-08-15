-- Company Detail "企業情報" 카드의 勤務地/業界/応募経路/応募職種 4개 필드. 기존 기업
-- 데이터는 값이 없으므로 전부 null을 허용하고 별도 백필은 하지 않는다.
alter table public.companies
  add column if not exists location text,
  add column if not exists industry text,
  add column if not exists source text,
  add column if not exists position text;
