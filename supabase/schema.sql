-- BeatRelay タイムライン用（Supabase SQL Editor で実行）

create table if not exists feed_songs (
  id text primary key,
  share_code text not null,
  title text not null,
  bpm int not null,
  mode text not null,
  creator_name text not null,
  creator_avatar text not null default '🎧',
  layers jsonb not null default '[]',
  completed_at timestamptz not null default now()
);

create table if not exists feed_comments (
  id uuid primary key default gen_random_uuid(),
  song_id text not null references feed_songs(id) on delete cascade,
  author_name text not null,
  author_avatar text not null default '🎧',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists feed_songs_completed_at on feed_songs(completed_at desc);
create index if not exists feed_comments_song_id on feed_comments(song_id, created_at desc);

alter table feed_songs enable row level security;
alter table feed_comments enable row level security;

drop policy if exists "feed_songs read" on feed_songs;
drop policy if exists "feed_songs insert" on feed_songs;
drop policy if exists "feed_songs delete" on feed_songs;
drop policy if exists "feed_comments read" on feed_comments;
drop policy if exists "feed_comments insert" on feed_comments;
create policy "feed_songs read" on feed_songs for select using (true);
create policy "feed_songs insert" on feed_songs for insert with check (true);
create policy "feed_songs delete" on feed_songs for delete using (true);
create policy "feed_comments read" on feed_comments for select using (true);
create policy "feed_comments insert" on feed_comments for insert with check (true);

-- いいね（1端末1曲1回）
create table if not exists feed_reactions (
  id text primary key,
  song_id text not null references feed_songs(id) on delete cascade,
  device_id text not null,
  author_name text not null,
  author_avatar text not null default '🎧',
  created_at timestamptz not null default now(),
  unique (song_id, device_id)
);

create index if not exists feed_reactions_song_id on feed_reactions(song_id, created_at desc);

alter table feed_reactions enable row level security;

drop policy if exists "feed_reactions read" on feed_reactions;
drop policy if exists "feed_reactions insert" on feed_reactions;
drop policy if exists "feed_reactions delete" on feed_reactions;
create policy "feed_reactions read" on feed_reactions for select using (true);
create policy "feed_reactions insert" on feed_reactions for insert with check (true);
create policy "feed_reactions delete" on feed_reactions for delete using (true);

-- 既存DB向け: BPMメタ（任意）
alter table feed_songs add column if not exists reference_bpm int;
alter table feed_songs add column if not exists section_bpms jsonb;

-- Pro サブスクリプション（Stripe Webhook で更新）
create table if not exists subscriptions (
  device_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_email text,
  customer_name text,
  status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status on subscriptions(status);

alter table subscriptions enable row level security;

alter table subscriptions add column if not exists customer_email text;
alter table subscriptions add column if not exists customer_name text;

drop policy if exists "subscriptions read own" on subscriptions;
drop policy if exists "subscriptions service write" on subscriptions;
drop policy if exists "subscriptions service update" on subscriptions;
create policy "subscriptions read own" on subscriptions for select using (true);
create policy "subscriptions service write" on subscriptions for insert with check (true);
create policy "subscriptions service update" on subscriptions for update using (true);

-- アクセス解析（匿名の端末ID + 閲覧パス）
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

-- 端末データ同期（scripts/device-sync-setup.sql と同内容）
create table if not exists device_backups (
  device_id text primary key,
  sync_code text not null unique,
  user_id uuid unique,
  profile jsonb not null default '{}',
  songs jsonb not null default '[]',
  layers jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create index if not exists device_backups_sync_code on device_backups(sync_code);
alter table device_backups add column if not exists user_id uuid unique;
create index if not exists device_backups_user_id on device_backups(user_id);

alter table device_backups enable row level security;

drop policy if exists "device_backups read" on device_backups;
drop policy if exists "device_backups upsert" on device_backups;
drop policy if exists "device_backups update" on device_backups;
create policy "device_backups read" on device_backups for select using (true);
create policy "device_backups upsert" on device_backups for insert with check (true);
create policy "device_backups update" on device_backups for update using (true);
