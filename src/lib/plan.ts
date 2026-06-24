import { isBillingConfigured, isProEntitled } from '@/lib/billing';
import { getUserProfile, saveUserProfile } from '@/lib/profile';

import {
  getAllLayers,
} from '@/lib/storage';

import type { UserPlan, Song, Layer, LayerAddMode } from '@/types';



/** 無料: 作れる曲（土台を置いた曲） */

export const FREE_MAX_CREATED_SONGS = 5;

/** 無料: 区間数上限 */

export const FREE_MAX_SECTIONS = 3;

/** 無料: 1日あたりの「重ね」セッション（完了＝1回・セッション内は何音でも） */

export const FREE_DAILY_LAYER_SESSIONS = 3;

/** 無料: 1日あたりの「続き（新区間）」セッション（完了＝1回） */

export const FREE_DAILY_EXTEND_SESSIONS = 3;

/** @deprecated FREE_DAILY_LAYER_SESSIONS を使用 */

export const FREE_DAILY_CONTRIBUTION_SESSIONS = FREE_DAILY_LAYER_SESSIONS;

/** タイムライン公開に必要な最低区間数 */

export const MIN_TIMELINE_SECTIONS = 3;



type DailyCounter = { date: string; count: number };



function getDailyCount(field: 'dailyLayerSessions' | 'dailyExtendSessions'): number {

  const profile = getUserProfile();

  const daily = profile[field];

  if (!daily || daily.date !== getTodayDateKey()) return 0;

  return daily.count;

}



function incrementDaily(field: 'dailyLayerSessions' | 'dailyExtendSessions'): void {

  const profile = getUserProfile();

  const today = getTodayDateKey();

  const prev = profile[field];

  const count = prev?.date === today ? prev.count + 1 : 1;

  saveUserProfile({ ...profile, [field]: { date: today, count } });

}



export function getUserPlan(): UserPlan {

  return getUserProfile().plan ?? 'free';

}



export function isProPlan(): boolean {
  if (isBillingConfigured()) {
    return isProEntitled();
  }
  return getUserPlan() === 'pro';
}



export function setUserPlan(plan: UserPlan): void {

  const profile = getUserProfile();

  saveUserProfile({ ...profile, plan });

}



export function getMaxSections(): number {
  return FREE_MAX_SECTIONS;
}



export function canPublishToTimeline(sectionCount: number): boolean {

  return sectionCount >= MIN_TIMELINE_SECTIONS;

}



function getCreatorDeviceId(layers: Layer[]): string | undefined {

  return layers.find((l) => l.contributorIndex === 0 && !l.isVirtual)?.contributorId;

}



/** この端末が土台（1番目）を置いた曲の数 */

export function countCreatedSongs(deviceId: string): number {

  const layers = getAllLayers();

  const creatorSongIds = new Set<string>();

  for (const layer of layers) {

    if (layer.contributorIndex === 0 && layer.contributorId === deviceId) {

      creatorSongIds.add(layer.songId);

    }

  }

  return creatorSongIds.size;

}



/** 他人の曲に参加した曲の数（重複なし） */

export function countJoinedSongs(deviceId: string): number {

  const layers = getAllLayers();

  const joined = new Set<string>();

  for (const layer of layers) {

    if (layer.isVirtual || layer.contributorId !== deviceId) continue;

    const creatorId = getCreatorDeviceId(layers.filter((l) => l.songId === layer.songId));

    if (creatorId && creatorId !== deviceId) {

      joined.add(layer.songId);

    }

  }

  return joined.size;

}



export function hasContributedToSong(songId: string, deviceId: string): boolean {

  return getAllLayers().some(

    (l) => l.songId === songId && l.contributorId === deviceId && !l.isVirtual,

  );

}



export function isSongCreator(layers: Layer[], deviceId: string): boolean {

  return getCreatorDeviceId(layers) === deviceId;

}



export function canCreateSong(deviceId: string): boolean {

  if (isProPlan()) return true;

  return countCreatedSongs(deviceId) < FREE_MAX_CREATED_SONGS;

}



export function canJoinSong(layers: Layer[], songId: string, deviceId: string): boolean {

  if (isSongCreator(layers, deviceId)) return true;

  if (hasContributedToSong(songId, deviceId)) return true;

  return true;

}



export function remainingCreatedSongs(deviceId: string): number | null {

  if (isProPlan()) return null;

  return Math.max(0, FREE_MAX_CREATED_SONGS - countCreatedSongs(deviceId));

}



/** 日本時間（JST）の日付 YYYY-MM-DD — 日次リセットは JST 0:00 */
export function getTodayDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}



export function getDailyLayerSessionCount(): number {

  return getDailyCount('dailyLayerSessions');

}



export function getDailyExtendSessionCount(): number {

  return getDailyCount('dailyExtendSessions');

}



export function canStartDailyLayerSession(): boolean {

  if (isProPlan()) return true;

  return getDailyLayerSessionCount() < FREE_DAILY_LAYER_SESSIONS;

}



export function canStartDailyExtendSession(): boolean {

  if (isProPlan()) return true;

  return getDailyExtendSessionCount() < FREE_DAILY_EXTEND_SESSIONS;

}



export function canStartDailySessionForMode(mode: LayerAddMode): boolean {

  return mode === 'extend' ? canStartDailyExtendSession() : canStartDailyLayerSession();

}



export function recordDailyLayerSession(): void {

  if (isProPlan()) return;

  incrementDaily('dailyLayerSessions');

}



export function recordDailyExtendSession(): void {

  if (isProPlan()) return;

  incrementDaily('dailyExtendSessions');

}



export function remainingDailyLayerSessions(): number | null {

  if (isProPlan()) return null;

  return Math.max(0, FREE_DAILY_LAYER_SESSIONS - getDailyLayerSessionCount());

}



export function remainingDailyExtendSessions(): number | null {

  if (isProPlan()) return null;

  return Math.max(0, FREE_DAILY_EXTEND_SESSIONS - getDailyExtendSessionCount());

}



/** @deprecated remainingDailyLayerSessions を使用 */

export function remainingDailyContributionSessions(): number | null {

  return remainingDailyLayerSessions();

}



/** @deprecated canStartDailyLayerSession を使用 */

export function canStartDailyContributionSession(): boolean {

  return canStartDailyLayerSession();

}



/** @deprecated recordDailyLayerSession / recordDailyExtendSession を使用 */

export function recordDailyContributionSession(): void {

  recordDailyLayerSession();

}



export function isInActiveContributionSession(

  deviceId: string,

  song: Pick<Song, 'activeContributorId'>,

): boolean {

  return Boolean(deviceId && song.activeContributorId === deviceId);

}



/** この曲で今日パート追加できるか（進行中セッションは枠を消費しない） */

export function canUserContributeToday(

  deviceId: string,

  song: Pick<Song, 'activeContributorId'>,

  mode?: LayerAddMode,

): boolean {

  if (!deviceId) return false;

  if (isProPlan()) return true;

  if (isInActiveContributionSession(deviceId, song)) return true;

  if (mode === 'layer') return canStartDailyLayerSession();

  if (mode === 'extend') return canStartDailyExtendSession();

  return canStartDailyLayerSession() || canStartDailyExtendSession();

}

