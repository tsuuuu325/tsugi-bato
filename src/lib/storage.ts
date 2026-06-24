import type { Song, Layer, SongWithLayers, StepPattern } from '@/types';
import {
  DEFAULT_BPM,
  normalizeSongWithLayers,
  getEffectiveSectionCount,
  getSectionBpms,
  getSectionTotalSteps,
  resizeStepPattern,
  foldPatternToCanonical,
} from '@/types';
import { getDefaultPattern, getCanonicalPatternLengthForPad } from '@/audio/engine';
import { getUsername, setUsername } from '@/lib/profile';

export { getUsername, setUsername };

const SONGS_KEY = 'tsugi-bato-songs';
const LAYERS_KEY = 'tsugi-bato-layers';
const LOCAL_FEED_KEY = 'tsugi-bato-local-feed';
const DATA_VERSION_KEY = 'tsugi-bato-data-version';
/** Bump to force full local wipe (increment when test data must go). */
const CURRENT_DATA_VERSION = '6';

function clearLocalSongStorage(): void {
  localStorage.removeItem(SONGS_KEY);
  localStorage.removeItem(LAYERS_KEY);
  localStorage.removeItem(LOCAL_FEED_KEY);
  localStorage.removeItem('tsugi-bato-local-comments');
  localStorage.removeItem('tsugi-bato-local-reactions');
  localStorage.removeItem('tsugi-bato-examples-version');
}

/** 古いデモ曲（Drift Waiting 等）が残っていたら削除 */
function purgeLegacyDemoSongs(): void {
  const songs = loadJson<Song[]>(SONGS_KEY, []);
  const stale = songs.some(
    (s) =>
      s.id === 'demo-001'
      || s.shareCode === 'DEMO01'
      || s.creatorName === 'Drift King'
      || s.title.includes('Drift Waiting'),
  );
  if (!stale) return;
  clearLocalSongStorage();
}

/** 開発中のテスト曲など、ローカル保存データを一度クリアする。true = Supabase も消す */
export function migrateStorageVersion(): boolean {
  purgeLegacyDemoSongs();
  if (localStorage.getItem(DATA_VERSION_KEY) === CURRENT_DATA_VERSION) return false;
  clearLocalSongStorage();
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  return true;
}

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

export function getAllSongs(): Song[] {
  return loadJson<Song[]>(SONGS_KEY, []);
}

export function getAllLayers(): Layer[] {
  return loadJson<Layer[]>(LAYERS_KEY, []);
}

export function saveSong(song: Song): void {
  const songs = getAllSongs();
  const idx = songs.findIndex((s) => s.id === song.id);
  if (idx >= 0) songs[idx] = song;
  else songs.unshift(song);
  saveJson(SONGS_KEY, songs);
}

export function saveLayer(layer: Layer): void {
  const layers = getAllLayers();
  layers.push(layer);
  saveJson(LAYERS_KEY, layers);
}

export function updateLayer(layerId: string, updates: Partial<Layer>): void {
  const layers = getAllLayers();
  const idx = layers.findIndex((l) => l.id === layerId);
  if (idx >= 0) {
    layers[idx] = { ...layers[idx], ...updates };
    saveJson(LAYERS_KEY, layers);
  }
}

export function deleteLayer(layerId: string): void {
  const layers = getAllLayers().filter((l) => l.id !== layerId);
  saveJson(LAYERS_KEY, layers);
}

export function deleteSong(songId: string): void {
  replaceAllSongs(getAllSongs().filter((s) => s.id !== songId));
  replaceAllLayers(getAllLayers().filter((l) => l.songId !== songId));
}

/** 未完成（参加待ち）のユーザー曲を削除 — サンプル曲は残す */
export function purgeOpenSongs(): number {
  const openIds = new Set(
    getAllSongs()
      .filter((s) => s.status === 'open' && !s.isExample)
      .map((s) => s.id),
  );
  if (openIds.size === 0) return 0;
  replaceAllSongs(getAllSongs().filter((s) => !openIds.has(s.id)));
  replaceAllLayers(getAllLayers().filter((l) => !openIds.has(l.songId)));
  return openIds.size;
}

export function replaceAllLayers(layers: Layer[]): void {
  saveJson(LAYERS_KEY, layers);
}

export function replaceAllSongs(songs: Song[]): void {
  saveJson(SONGS_KEY, songs);
}

export function getSongById(id: string): Song | undefined {
  return getAllSongs().find((s) => s.id === id);
}

export function getSongByShareCode(code: string): Song | undefined {
  return getAllSongs().find((s) => s.shareCode === code.toUpperCase());
}

export function getLayersForSong(songId: string): Layer[] {
  return getAllLayers()
    .filter((l) => l.songId === songId)
    .sort((a, b) => a.contributorIndex - b.contributorIndex);
}

function fitLayerPattern(layer: Layer, sectionBpm: number): StepPattern | undefined {
  const totalSteps = getSectionTotalSteps(sectionBpm);
  const canonicalLen = getCanonicalPatternLengthForPad(layer.loopId);
  const fallback = getDefaultPattern(layer.loopId);
  const base = layer.pattern?.length && layer.pattern.some(Boolean)
    ? foldPatternToCanonical(layer.pattern, canonicalLen)
    : fallback;
  const sized = resizeStepPattern(base, totalSteps);
  if (
    layer.pattern?.length === sized.length
    && layer.pattern.join('') === sized.join('')
  ) {
    return undefined;
  }
  return sized;
}

/** 旧 localStorage データのパターン・区間数を修復 */
export function migrateLegacyData(): void {
  const allLayers = getAllLayers();
  for (const layer of allLayers) {
    const song = getSongById(layer.songId);
    if (!song) continue;
    if (song.isExample) continue;
    const sectionIndex = layer.sectionIndex ?? 0;
    const sectionBpm = song.sectionBpms?.[sectionIndex] ?? song.bpm ?? DEFAULT_BPM;
    const pattern = fitLayerPattern(layer, sectionBpm);
    const updates: Partial<Layer> = {};
    if (pattern) updates.pattern = pattern;
    if (layer.sectionIndex == null) updates.sectionIndex = 0;
    if (!layer.addMode) updates.addMode = layer.contributorIndex === 0 ? 'layer' : 'extend';
    if (Object.keys(updates).length > 0) {
      updateLayer(layer.id, updates);
    }
  }

  for (const song of getAllSongs()) {
    const layers = getLayersForSong(song.id);
    const sectionCount = getEffectiveSectionCount(song, layers);
    const sectionBpms = getSectionBpms({ ...song, sectionCount });
    const referenceBpm = song.referenceBpm ?? song.bpm ?? DEFAULT_BPM;
    const orphanedSession = song.activeContributorId
      && !layers.some((l) => !l.isVirtual && l.contributorId === song.activeContributorId);
    const needsSave = song.sectionCount !== sectionCount
      || !song.sectionBpms
      || song.referenceBpm == null
      || orphanedSession;
    if (!needsSave) continue;
    saveSong({
      ...song,
      sectionCount,
      sectionBpms,
      referenceBpm,
      activeContributorId: orphanedSession ? undefined : song.activeContributorId,
    });
  }
}

export function getSongWithLayers(id: string): SongWithLayers | undefined {
  const song = getSongById(id);
  if (!song) return undefined;
  return normalizeSongWithLayers({ ...song, layers: getLayersForSong(id) });
}

export function getSongWithLayersByCode(code: string): SongWithLayers | undefined {
  const song = getSongByShareCode(code);
  if (!song) return undefined;
  return normalizeSongWithLayers({ ...song, layers: getLayersForSong(song.id) });
}

export function getOpenSongs(): SongWithLayers[] {
  return getAllSongs()
    .filter((s) => s.status === 'open')
    .map((s) => normalizeSongWithLayers({ ...s, layers: getLayersForSong(s.id) }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getCompletedSongs(): SongWithLayers[] {
  return getAllSongs()
    .filter((s) => s.status === 'complete')
    .map((s) => normalizeSongWithLayers({ ...s, layers: getLayersForSong(s.id) }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** @deprecated デモ曲の自動投入は行わない — サンプル曲は seedExampleBeats（songStore.init） */
export function seedDemoData(): void {
  /* intentionally empty */
}
