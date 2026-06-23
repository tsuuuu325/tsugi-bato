export type PadCategory = 'kick' | 'snare' | 'hat' | 'clap' | 'bass' | 'synth' | 'fx' | 'perc' | 'cowbell';

export type SongStatus = 'open' | 'complete';
export type SongMode = 'solo' | 'collab' | 'virtual';
export type LayerAddMode = 'layer' | 'extend';
export type UserPlan = 'free' | 'pro';

/** 1区間 = 10秒（壁時計固定） */
export const SECTION_SECONDS = 10;
/** 1小節 = 16ステップ（4/4・16分音符） */
export const STEPS_PER_BAR = 16;
/** @deprecated STEPS_PER_BAR を使用 */
export const STEPS_PER_SECTION = STEPS_PER_BAR;
export const BEATS_PER_BAR = 4;
/** ロングパッドのループ長（試聴・デフォルトパターン） */
export const LONG_LOOP_BARS = 4;
export const LONG_LOOP_STEPS = LONG_LOOP_BARS * STEPS_PER_BAR;
/** デフォルトの区間上限（無料プランと同じ） */
export const DEFAULT_MAX_SECTIONS = 3;
/** @deprecated getMaxSectionsForPlan() を使用 */
export const MAX_SECTIONS = DEFAULT_MAX_SECTIONS;
export const MAX_SONG_SECONDS = DEFAULT_MAX_SECTIONS * SECTION_SECONDS;

/** ドラムパッド1つの定義 */
export interface PadDefinition {
  id: string;
  name: string;
  nameJa: string;
  category: PadCategory;
  preset: string;
  color: string;
  colorDark: string;
  shortLabel: string;
  /** 4x4グリッド上の位置（表示順） */
  gridIndex: number;
  isFoundation?: boolean;
  /** ロングループ系（シーケンサー用の長めパッド） */
  isLong?: boolean;
  /** ロングパッドのジャンル分類（UI表示用） */
  longGenre?: 'phonk' | 'edm' | 'common';
  /** サンプル曲専用 — 通常のパッド選択には出さない */
  isExample?: boolean;
}

export type StepPattern = (0 | 1)[];

export interface Layer {
  id: string;
  songId: string;
  loopId: string;
  /** 端末固定ID（名前変更しても同一人物） */
  contributorId?: string;
  contributorName: string;
  contributorAvatar?: string;
  contributorIndex: number;
  /** 何番目の10秒区間か（0 = 0–10秒） */
  sectionIndex: number;
  /** layer=同じ10秒に重ねる / extend=次の10秒を新規作成 */
  addMode: LayerAddMode;
  isVirtual: boolean;
  addedAt: string;
  /** 区間のステップパターン（長さ = 区間BPMに応じた総ステップ数） */
  pattern?: StepPattern;
}

export interface Song {
  id: string;
  shareCode: string;
  title: string;
  bpm: number;
  /** 再生スピード計算の基準（作成時に固定・変更しない） */
  referenceBpm?: number;
  maxBars: number;
  maxContributors: number;
  status: SongStatus;
  mode: SongMode;
  challengeTag?: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  /** 10秒区間の数（最初は1 = 0–10秒のみ） */
  sectionCount: number;
  /** コラボ/ソロで現在パート追加中の端末ID */
  activeContributorId?: string;
  /** 現在の追加セッション開始時刻（キャンセル時にこの後の音だけ戻す） */
  activeSessionStartedAt?: string;
  /** 各区間のBPM（index=sectionIndex、未設定時は bpm と同じ） */
  sectionBpms?: number[];
  /** アプリ内サンプル曲（例: Volento風デモ） */
  isExample?: boolean;
}

export interface SongWithLayers extends Song {
  layers: Layer[];
}

export interface UserProfile {
  /** 端末ごとに1つ・変更不可 */
  deviceId: string;
  username: string;
  avatarEmoji: string;
  /** UI言語 */
  locale?: import('@/i18n/types').Locale;
  /** free=制限あり / pro=無制限（将来Stripe連携） */
  plan?: UserPlan;
  /** @deprecated dailyLayerSessions / dailyExtendSessions を使用 */
  dailyContributions?: {
    date: string;
    count: number;
  };
  /** 無料: 1日あたりの「重ね」セッション（完了＝1回） */
  dailyLayerSessions?: {
    date: string;
    count: number;
  };
  /** 無料: 1日あたりの「続き（新区間）」セッション（完了＝1回） */
  dailyExtendSessions?: {
    date: string;
    count: number;
  };
  /** Pro決済用メール（領収・問い合わせ） */
  billingEmail?: string;
  /** Pro決済用の請求名義・氏名 */
  billingName?: string;
  /** クラウド同期コード（LINE / X 等の別ブラウザ復元用） */
  syncCode?: string;
  /** Supabase Auth ユーザーID（ログイン時） */
  authUserId?: string;
}

export interface FeedComment {
  id: string;
  songId: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
}

/** タイムラインのいいね（1端末1回） */
export interface FeedReaction {
  id: string;
  songId: string;
  deviceId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
}

export interface FeedSong {
  id: string;
  shareCode: string;
  title: string;
  bpm: number;
  referenceBpm?: number;
  sectionBpms?: number[];
  mode: SongMode;
  creatorName: string;
  creatorAvatar: string;
  layers: Layer[];
  completedAt: string;
}

export const AVATAR_OPTIONS = ['🎧', '🔥', '😎', '👻', '🐺', '💀', '🎹', '🥁', '🌙', '⚡', '🦊', '😈'] as const;
export const DEFAULT_AVATAR = '🎧';

export const MAX_CONTRIBUTORS = 6;
export const MIN_BPM = 70;
export const MAX_BPM = 220;
export const DEFAULT_BPM = 140;
/** @deprecated リニアBPM同期に移行。互換のため残置 */
export const BPM_SPEED_EXPONENT = 1;
export const DEFAULT_BARS = 8;

export const CATEGORY_LABELS: Record<PadCategory, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  hat: 'HI-HAT',
  clap: 'CLAP',
  bass: 'BASS',
  synth: 'SYNTH',
  fx: 'FX',
  perc: 'PERC',
  cowbell: 'COW',
};

/** 4小節ループの再生秒数 */
export function getLongLoopDurationSeconds(bpm: number): number {
  return (LONG_LOOP_BARS * BEATS_PER_BAR * 60) / bpm;
}

export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function getLayerContributorKey(layer: Layer): string {
  return layer.contributorId ?? layer.contributorName;
}

export function getContributorIds(layers: Layer[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const layer of layers) {
    if (layer.isVirtual) continue;
    const key = getLayerContributorKey(layer);
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  return order;
}

export function getContributorCount(layers: Layer[]): number {
  return getContributorIds(layers).length;
}

export interface ContributorSummary {
  id: string;
  name: string;
}

export function getContributorSummaries(layers: Layer[]): ContributorSummary[] {
  return getContributorIds(layers).map((id) => {
    const layer = layers.find((l) => !l.isVirtual && getLayerContributorKey(l) === id);
    return { id, name: layer?.contributorName ?? '?' };
  });
}

export function formatContributorNames(layers: Layer[], separator = ' · '): string {
  return getContributorSummaries(layers).map((c) => c.name).join(separator);
}

export function userContributedToSong(layers: Layer[], deviceId: string): boolean {
  return layers.some((l) => !l.isVirtual && l.contributorId === deviceId);
}

export function getUserLayers(layers: Layer[], deviceId: string): Layer[] {
  return layers.filter((l) => !l.isVirtual && l.contributorId === deviceId);
}

export function isSongFull(song: Song, layers: Layer[]): boolean {
  if (song.activeContributorId) return false;
  return getContributorCount(layers) >= song.maxContributors;
}

export function canAddLayer(song: Song, layers: Layer[]): boolean {
  if (song.status !== 'open') return false;
  if (song.activeContributorId) return true;
  return getContributorCount(layers) < song.maxContributors;
}

export function canExtendSection(sectionCount: number, maxSections = DEFAULT_MAX_SECTIONS): boolean {
  return sectionCount < maxSections;
}

/** この端末がパートを足せるか */
export function canUserAddLayer(song: Song, layers: Layer[], deviceId: string): boolean {
  if (!deviceId) return false;
  if (!canAddLayer(song, layers)) return false;

  if (song.activeContributorId === deviceId) return true;
  if (song.activeContributorId) return false;

  if (song.mode === 'solo') return true;
  return !hasUserFinishedContributing(song, layers, deviceId);
}

/** 過去にパートを完了したか（追加中は false） */
export function hasUserFinishedContributing(song: Song, layers: Layer[], deviceId: string): boolean {
  if (song.activeContributorId === deviceId) return false;
  return getUserLayers(layers, deviceId).length > 0;
}

/** @deprecated use hasUserFinishedContributing */
export function hasUserContributed(layers: Layer[], deviceId: string, song?: Song): boolean {
  if (song) return hasUserFinishedContributing(song, layers, deviceId);
  return layers.some((l) => !l.isVirtual && l.contributorId === deviceId);
}

export function getLockedAddMode(song: Song, layers: Layer[], deviceId: string): LayerAddMode | null {
  if (song.activeContributorId !== deviceId) return null;
  const userLayers = getUserLayers(layers, deviceId);
  if (userLayers.length === 0) return null;
  return userLayers[userLayers.length - 1].addMode;
}

/** 今の追加セッションで続き（extend）を1回以上使ったか */
export function hasExtendedInCurrentSession(song: Song, layers: Layer[], deviceId: string): boolean {
  if (!deviceId || song.activeContributorId !== deviceId) return false;
  return getUserLayers(layers, deviceId).some((l) => l.addMode === 'extend');
}

/** この曲で一度でも新しい10秒（extend）を作ったか */
export function hasUserEverExtended(layers: Layer[], deviceId: string): boolean {
  if (!deviceId) return false;
  return getUserLayers(layers, deviceId).some((l) => l.addMode === 'extend');
}

/** 新しい10秒を追加できるか（コラボは1人1回まで / ソロはセッションごとに1回） */
export function canUserExtendSection(song: Song, layers: Layer[], deviceId: string, maxSections: number): boolean {
  if (song.sectionCount >= maxSections) return false;
  if (hasExtendedInCurrentSession(song, layers, deviceId)) return false;
  if (song.mode === 'solo') return true;
  return !hasUserEverExtended(layers, deviceId);
}

/** セッション中にロックされた重ね先区間 */
export function getLockedTargetSection(song: Song, layers: Layer[], deviceId: string): number | null {
  if (song.activeContributorId !== deviceId) return null;
  const userLayers = getUserLayers(layers, deviceId);
  if (userLayers.length === 0) return null;
  return userLayers[userLayers.length - 1].sectionIndex;
}

/** 曲データとレイヤーから実際の区間数を算出（上限でクランプ） */
export function getEffectiveSectionCount(
  song: Pick<Song, 'sectionCount'>,
  layers: Pick<Layer, 'sectionIndex'>[],
  maxSections?: number,
): number {
  const fromLayers = layers.reduce((m, l) => Math.max(m, (l.sectionIndex ?? 0) + 1), 0);
  const raw = Math.max(song.sectionCount ?? 1, fromLayers, 1);
  return maxSections != null ? Math.min(raw, maxSections) : raw;
}

/** 1=土台, 2=続き… の表示 */
export function getPartOrdinal(n: number): string {
  return `${n}番目`;
}

export function getNextPartNumber(layers: Layer[], song?: Song): number {
  const count = getContributorIds(layers).length;
  if (song?.activeContributorId) {
    const idx = getContributorIds(layers).indexOf(song.activeContributorId);
    if (idx >= 0) return idx + 1;
  }
  return count + 1;
}

export function getSectionTimeLabel(sectionIndex: number): string {
  const start = sectionIndex * SECTION_SECONDS;
  return `${start}–${start + SECTION_SECONDS}秒`;
}

export function getReferenceBpm(song: Pick<Song, 'bpm' | 'referenceBpm' | 'sectionBpms'>): number {
  if (song.referenceBpm != null) return song.referenceBpm;
  const s0 = song.sectionBpms?.[0];
  // 旧データ救済: bpm と区間0が同じ＝同期バグ済み → 標準140を基準に
  if (s0 != null && s0 === song.bpm) return DEFAULT_BPM;
  return song.bpm;
}

/** 区間BPMに対する再生速度（140BPM基準・リニア） */
export function getAbsoluteSpeedRatio(sectionBpm: number): number {
  return sectionBpm / DEFAULT_BPM;
}

/** @deprecated 区間間の相対比較用 */
export function getSectionSpeedRatio(baseBpm: number, sectionBpm: number): number {
  return sectionBpm / baseBpm;
}

/** 10秒区間に入る小節数（BPM↑で増・BPM↓で減） */
export function getBarsPerSection(sectionBpm: number): number {
  const ideal = (SECTION_SECONDS * sectionBpm) / (BEATS_PER_BAR * 60);
  return Math.max(1, Math.round(ideal));
}

/** 区間の総ステップ数（例: 140BPM→96、220BPM→144、70BPM→48） */
export function getSectionTotalSteps(sectionBpm: number): number {
  return getBarsPerSection(sectionBpm) * STEPS_PER_BAR;
}

/** 1小節パターンを区間の全ステップ長にタイル展開 */
export function resizeStepPattern(pattern: StepPattern, totalSteps: number): StepPattern {
  if (totalSteps <= 0) return [];
  const base = pattern.length > 0 ? pattern : [0];
  const out: (0 | 1)[] = [];
  for (let i = 0; i < totalSteps; i++) {
    out.push(base[i % base.length] ? 1 : 0);
  }
  return out;
}

/** 10秒に収まるよう調整したステップ間隔 */
export function getSectionStepMs(_baseBpm: number, sectionBpm: number): number {
  return (SECTION_SECONDS * 1000) / getSectionTotalSteps(sectionBpm);
}

export function getSectionDurationSeconds(_baseBpm: number, _sectionBpm: number): number {
  return SECTION_SECONDS;
}

/** @deprecated 再生も常に10秒区間 */
export function getSectionPlayDurationSeconds(_baseBpm: number, _sectionBpm: number): number {
  return SECTION_SECONDS;
}

export function getSongDurationSeconds(sectionCount: number): number {
  return sectionCount * SECTION_SECONDS;
}

export function getSectionBpms(song: Pick<Song, 'bpm' | 'sectionCount' | 'sectionBpms'>): number[] {
  return Array.from({ length: song.sectionCount }, (_, i) => song.sectionBpms?.[i] ?? song.bpm);
}

/** 曲の長さ（区間数 × 10秒） */
export function getSongDurationFromSong(song: Pick<Song, 'bpm' | 'sectionCount' | 'sectionBpms' | 'referenceBpm'>): number {
  return song.sectionCount * SECTION_SECONDS;
}

/** @deprecated getSongDurationFromSong と同じ */
export function getSongPlayDurationFromSong(song: Pick<Song, 'bpm' | 'sectionCount' | 'sectionBpms' | 'referenceBpm'>): number {
  return getSongDurationFromSong(song);
}

/** 1番目が土台（0–10秒）に重ね足し中か — 2区間目以降や続きモードでは false */
export function isCreatorLayeringSession(song: Song, layers: Layer[], deviceId: string): boolean {
  if (song.activeContributorId !== deviceId) return false;
  if (song.sectionCount !== 1) return false;
  const ids = getContributorIds(layers);
  if (ids.length !== 1 || ids[0] !== deviceId) return false;
  const userLayers = getUserLayers(layers, deviceId);
  if (userLayers.length === 0) return false;
  if (userLayers.some((l) => l.addMode === 'extend')) return false;
  if (layers.some((l) => !l.isVirtual && l.sectionIndex > 0)) return false;
  return true;
}

/** 続き（新しい10秒）を作り、同じ区間に何音でも足し中か */
export function isExtendLayeringSession(song: Song, layers: Layer[], deviceId: string): boolean {
  if (song.activeContributorId !== deviceId) return false;
  if (getLockedAddMode(song, layers, deviceId) !== 'extend') return false;
  return hasExtendedInCurrentSession(song, layers, deviceId);
}

/** 土台または続きの区間に、完了まで何音でも足せるセッションか */
export function isMultiSoundLayeringSession(song: Song, layers: Layer[], deviceId: string): boolean {
  return isCreatorLayeringSession(song, layers, deviceId)
    || isExtendLayeringSession(song, layers, deviceId);
}

export function isPendingContributionModeChoice(song: Song, layers: Layer[], deviceId: string): boolean {
  if (!deviceId || layers.length < 1) return false;
  if (song.activeContributorId && song.activeContributorId !== deviceId) return false;
  if (isCreatorLayeringSession(song, layers, deviceId)) return false;
  if (getLockedAddMode(song, layers, deviceId) != null) return false;
  if (song.activeContributorId === deviceId) {
    return getUserLayers(layers, deviceId).length === 0;
  }
  return true;
}

export function normalizeLayer(layer: Layer, index: number): Layer {
  return {
    ...layer,
    sectionIndex: layer.sectionIndex ?? 0,
    addMode: layer.addMode ?? (index === 0 ? 'extend' : 'layer'),
  };
}

/** レイヤーパターンを区間BPMに合わせた長さに揃える */
export function fitLayerPatternToSection(
  pattern: StepPattern | undefined,
  fallbackBar: StepPattern,
  sectionBpm: number,
): StepPattern {
  const totalSteps = getSectionTotalSteps(sectionBpm);
  const base = pattern?.length ? pattern : fallbackBar;
  return resizeStepPattern(base, totalSteps);
}

export function normalizeSongWithLayers(song: SongWithLayers, maxSections?: number): SongWithLayers {
  const rawCount = Math.max(
    song.sectionCount ?? 1,
    ...song.layers.map((l) => l.sectionIndex + 1),
    1,
  );
  const sectionCount = maxSections != null ? Math.min(rawCount, maxSections) : rawCount;
  const sectionBpms = Array.from({ length: sectionCount }, (_, i) => song.sectionBpms?.[i] ?? song.bpm);
  const referenceBpm = song.referenceBpm ?? song.bpm;
  const layers = song.layers.map((layer, index) => {
    const normalized = normalizeLayer(layer, index);
    const bpm = sectionBpms[normalized.sectionIndex] ?? song.bpm;
    const totalSteps = getSectionTotalSteps(bpm);
    if (!normalized.pattern || normalized.pattern.length !== totalSteps) {
      const base = normalized.pattern?.length
        ? normalized.pattern
        : (Array(STEPS_PER_BAR).fill(0) as StepPattern);
      return { ...normalized, pattern: resizeStepPattern(base, totalSteps) };
    }
    return normalized;
  });
  return { ...song, sectionCount, sectionBpms, referenceBpm, layers };
}

export const ADD_MODE_LABELS: Record<LayerAddMode, { title: string; desc: string }> = {
  layer: {
    title: '同じ10秒に重ねる',
    desc: '今の区間に何音でも重ねる（続きは追加不可）',
  },
  extend: {
    title: '次の10秒を作る',
    desc: '続きの区間を作って何音でも足す（重ねは追加不可）',
  },
};

/** @deprecated use PadDefinition */
export type LoopDefinition = PadDefinition;
export type LoopCategory = PadCategory;
