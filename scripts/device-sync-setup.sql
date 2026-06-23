-- 端末データのクラウド同期（LINE / X アプリ内ブラウザなど別ブラウザ間の復元用）
-- Supabase SQL Editor で実行

create table if not exists device_backups (
  device_id text primary key,
  sync_code text not null unique,
  profile jsonb not null default '{}',
  songs jsonb not null default '[]',
  layers jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create index if not exists device_backups_sync_code on device_backups(sync_code);

alter table device_backups enable row level security;

drop policy if exists "device_backups read" on device_backups;
drop policy if exists "device_backups upsert" on device_backups;
create policy "device_backups read" on device_backups for select using (true);
create policy "device_backups upsert" on device_backups for insert with check (true);
create policy "device_backups update" on device_backups for update using (true);
