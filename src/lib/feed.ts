import { v4 as uuidv4 } from 'uuid';
import type { FeedComment, FeedReaction, FeedSong, SongWithLayers } from '@/types';
import { isSupabaseConfigured, supabaseGet, supabaseInsert, supabasePost, supabaseDelete } from '@/lib/supabase';

const LOCAL_FEED_KEY = 'tsugi-bato-local-feed';
const LOCAL_COMMENTS_KEY = 'tsugi-bato-local-comments';
const LOCAL_REACTIONS_KEY = 'tsugi-bato-local-reactions';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function songToFeed(song: SongWithLayers, creatorAvatar: string): FeedSong {
  return {
    id: song.id,
    shareCode: song.shareCode,
    title: song.title,
    bpm: song.bpm,
    referenceBpm: song.referenceBpm,
    sectionBpms: song.sectionBpms,
    mode: song.mode,
    creatorName: song.creatorName,
    creatorAvatar,
    layers: song.layers,
    completedAt: song.updatedAt,
  };
}

function saveLocalFeedItem(item: FeedSong): void {
  const feed = loadJson<FeedSong[]>(LOCAL_FEED_KEY, []);
  const idx = feed.findIndex((f) => f.id === item.id);
  if (idx >= 0) feed[idx] = item;
  else feed.unshift(item);
  saveJson(LOCAL_FEED_KEY, feed);
}

interface FeedSongRow {
  id: string;
  share_code: string;
  title: string;
  bpm: number;
  reference_bpm?: number;
  section_bpms?: number[];
  mode: FeedSong['mode'];
  creator_name: string;
  creator_avatar: string;
  layers: FeedSong['layers'];
  completed_at: string;
}

interface CommentRow {
  id: string;
  song_id: string;
  author_name: string;
  author_avatar: string;
  body: string;
  created_at: string;
}

interface ReactionRow {
  id: string;
  song_id: string;
  device_id: string;
  author_name: string;
  author_avatar: string;
  created_at: string;
}

export async function publishSongToFeed(song: SongWithLayers, creatorAvatar: string): Promise<void> {
  const item = songToFeed(song, creatorAvatar);
  saveLocalFeedItem(item);

  await supabasePost('feed_songs', {
    id: item.id,
    share_code: item.shareCode,
    title: item.title,
    bpm: item.bpm,
    reference_bpm: item.referenceBpm ?? item.bpm,
    section_bpms: item.sectionBpms ?? [item.bpm],
    mode: item.mode,
    creator_name: item.creatorName,
    creator_avatar: item.creatorAvatar,
    layers: item.layers,
    completed_at: item.completedAt,
  });
}

export async function fetchFeedSongs(): Promise<FeedSong[]> {
  const local = loadJson<FeedSong[]>(LOCAL_FEED_KEY, []);

  const remote = await supabaseGet<FeedSongRow[]>(
    'feed_songs?select=*&order=completed_at.desc&limit=50',
  );

  if (!remote) {
    return [...local].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }

  const mapped: FeedSong[] = remote.map((row) => ({
    id: row.id,
    shareCode: row.share_code,
    title: row.title,
    bpm: row.bpm,
    referenceBpm: row.reference_bpm ?? row.bpm,
    sectionBpms: row.section_bpms,
    mode: row.mode,
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar,
    layers: row.layers,
    completedAt: row.completed_at,
  }));

  const merged = new Map<string, FeedSong>();
  for (const item of mapped) merged.set(item.id, item);
  for (const item of local) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

export async function fetchComments(songId: string): Promise<FeedComment[]> {
  const allLocal = loadJson<FeedComment[]>(LOCAL_COMMENTS_KEY, []);
  const local = allLocal.filter((c) => c.songId === songId);

  const remote = await supabaseGet<CommentRow[]>(
    `feed_comments?select=*&song_id=eq.${encodeURIComponent(songId)}&order=created_at.asc`,
  );

  if (!remote) {
    return local.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const mapped: FeedComment[] = remote.map((row) => ({
    id: row.id,
    songId: row.song_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    body: row.body,
    createdAt: row.created_at,
  }));

  const merged = new Map<string, FeedComment>();
  for (const c of mapped) merged.set(c.id, c);
  for (const c of local) merged.set(c.id, c);

  return [...merged.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function postComment(
  songId: string,
  authorName: string,
  authorAvatar: string,
  body: string,
): Promise<FeedComment> {
  const comment: FeedComment = {
    id: uuidv4(),
    songId,
    authorName,
    authorAvatar,
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };

  const allLocal = loadJson<FeedComment[]>(LOCAL_COMMENTS_KEY, []);
  allLocal.push(comment);
  saveJson(LOCAL_COMMENTS_KEY, allLocal);

  await supabaseInsert('feed_comments', {
    id: comment.id,
    song_id: songId,
    author_name: authorName,
    author_avatar: authorAvatar,
    body: comment.body,
    created_at: comment.createdAt,
  });

  return comment;
}

export async function fetchReactions(songId: string): Promise<FeedReaction[]> {
  const allLocal = loadJson<FeedReaction[]>(LOCAL_REACTIONS_KEY, []);
  const local = allLocal.filter((r) => r.songId === songId);

  const remote = await supabaseGet<ReactionRow[]>(
    `feed_reactions?select=*&song_id=eq.${encodeURIComponent(songId)}&order=created_at.desc`,
  );

  if (!remote) {
    return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const mapped: FeedReaction[] = remote.map((row) => ({
    id: row.id,
    songId: row.song_id,
    deviceId: row.device_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    createdAt: row.created_at,
  }));

  const merged = new Map<string, FeedReaction>();
  for (const r of mapped) merged.set(r.deviceId, r);
  for (const r of local) merged.set(r.deviceId, r);

  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function toggleReaction(
  songId: string,
  deviceId: string,
  authorName: string,
  authorAvatar: string,
): Promise<{ added: boolean; reactions: FeedReaction[] }> {
  const allLocal = loadJson<FeedReaction[]>(LOCAL_REACTIONS_KEY, []);
  const existing = allLocal.find((r) => r.songId === songId && r.deviceId === deviceId);

  if (existing) {
    const next = allLocal.filter((r) => r.id !== existing.id);
    saveJson(LOCAL_REACTIONS_KEY, next);
    await supabaseDelete(
      `feed_reactions?song_id=eq.${encodeURIComponent(songId)}&device_id=eq.${encodeURIComponent(deviceId)}`,
    );
    const reactions = await fetchReactions(songId);
    return { added: false, reactions };
  }

  const reaction: FeedReaction = {
    id: uuidv4(),
    songId,
    deviceId,
    authorName,
    authorAvatar,
    createdAt: new Date().toISOString(),
  };

  allLocal.push(reaction);
  saveJson(LOCAL_REACTIONS_KEY, allLocal);

  await supabaseInsert('feed_reactions', {
    id: reaction.id,
    song_id: songId,
    device_id: deviceId,
    author_name: authorName,
    author_avatar: authorAvatar,
    created_at: reaction.createdAt,
  });

  const reactions = await fetchReactions(songId);
  return { added: true, reactions };
}

export function isFeedGlobal(): boolean {
  return isSupabaseConfigured();
}
