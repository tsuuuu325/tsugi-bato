-- Supabase SQL Editor で実行（アクセス解析用）
-- フッターに「訪問 ○人 · PV ○○」を表示するには VITE_SHOW_VISITOR_STATS=true も設定

create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null default '/',
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at on site_visits(created_at desc);
create index if not exists site_visits_visitor_id on site_visits(visitor_id);

alter table site_visits enable row level security;

drop policy if exists "site_visits insert" on site_visits;
create policy "site_visits insert" on site_visits for insert with check (true);

create or replace function get_site_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'unique_visitors', (select count(distinct visitor_id) from site_visits),
    'pageviews', (select count(*) from site_visits),
    'today_unique', (
      select count(distinct visitor_id)
      from site_visits
      where created_at >= (current_date at time zone 'Asia/Tokyo')
    ),
    'today_pageviews', (
      select count(*)
      from site_visits
      where created_at >= (current_date at time zone 'Asia/Tokyo')
    )
  );
$$;

grant execute on function get_site_stats() to anon, authenticated;
