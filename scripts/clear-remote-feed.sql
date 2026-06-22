-- Supabase SQL Editor で実行（タイムラインのテスト曲をすべて削除）
-- コメント・いいねは feed_songs 削除で連鎖削除されます

drop policy if exists "feed_songs delete" on feed_songs;
create policy "feed_songs delete" on feed_songs for delete using (true);

delete from feed_songs;
