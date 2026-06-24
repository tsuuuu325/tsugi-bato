import type { Song, Layer, UserProfile } from '@/types';
import { generateShareCode } from '@/types';
import { getUserProfile, saveUserProfile, ensureDeviceId } from '@/lib/profile';
import { getTodayDateKey } from '@/lib/plan';
import {
  getAllSongs,
  getAllLayers,
  replaceAllSongs,
  replaceAllLayers,
} from '@/lib/storage';
import { isSupabaseConfigured, supabaseGet, supabaseUpsert, supabaseInsert, supabasePatch } from '@/lib/supabase';

const SYNC_CODE_KEY = 'tsugi-bato-sync-code';
const LAST_PUSH_KEY = 'tsugi-bato-sync-pushed-at';

interface DeviceBackupRow {
  device_id: string;
  sync_code: string;
  user_id?: string | null;
  profile: UserProfile;
  songs: Song[];
  layers: Layer[];
  updated_at: string;
}

let pullComplete = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function songTimestamp(song: Song): number {
  return new Date(song.updatedAt ?? song.createdAt ?? 0).getTime();
}

function snapshotLocalBackup(deviceId: string): DeviceBackupRow {
  const profile = getUserProfile();
  const songs = getAllSongs().filter((s) => !s.isExample);
  const songIds = new Set(songs.map((s) => s.id));
  const layers = getAllLayers().filter((l) => songIds.has(l.songId));
  return {
    device_id: deviceId,
    sync_code: ensureLocalSyncCode(),
    user_id: profile.authUserId ?? null,
    profile,
    songs,
    layers,
    updated_at: localStorage.getItem(LAST_PUSH_KEY) ?? new Date(0).toISOString(),
  };
}

function mergeDailyCounter(
  a?: { date: string; count: number },
  b?: { date: string; count: number },
): { date: string; count: number } | undefined {
  const today = getTodayDateKey();
  const aCount = a?.date === today ? a.count : 0;
  const bCount = b?.date === today ? b.count : 0;
  if (aCount === 0 && bCount === 0) {
    if (a?.date === today) return a;
    if (b?.date === today) return b;
    return a ?? b;
  }
  return { date: today, count: Math.max(aCount, bCount) };
}

function mergeProfiles(base: UserProfile, extra: Partial<UserProfile>, userId: string, email?: string): UserProfile {
  const merged: UserProfile = {
    ...base,
    ...extra,
    deviceId: base.deviceId || extra.deviceId || ensureDeviceId(),
    authUserId: userId,
    plan: (base.plan === 'pro' || extra.plan === 'pro') ? 'pro' : (extra.plan ?? base.plan ?? 'free'),
    dailyLayerSessions: mergeDailyCounter(base.dailyLayerSessions, extra.dailyLayerSessions),
    dailyExtendSessions: mergeDailyCounter(base.dailyExtendSessions, extra.dailyExtendSessions),
    billingEmail: base.billingEmail || extra.billingEmail || email,
    billingName: base.billingName || extra.billingName,
  };
  if (!merged.username?.trim() && extra.username?.trim()) {
    merged.username = extra.username.trim();
  }
  return merged;
}

/** 複数ソースの曲・レイヤー・プロフィールを統合（上書きではなくマージ） */
export function mergeDeviceBackups(
  sources: Array<DeviceBackupRow | null | undefined>,
  userId: string,
  email?: string,
): DeviceBackupRow {
  const rows = sources.filter(Boolean) as DeviceBackupRow[];
  const local = rows[0];
  const deviceId = local.device_id || ensureDeviceId();
  const syncCode = rows.map((r) => r.sync_code).find(Boolean) || ensureLocalSyncCode();

  const songMap = new Map<string, Song>();
  for (const row of rows) {
    for (const song of row.songs ?? []) {
      if (song.isExample) continue;
      const existing = songMap.get(song.id);
      if (!existing || songTimestamp(song) >= songTimestamp(existing)) {
        songMap.set(song.id, song);
      }
    }
  }

  const songIds = new Set(songMap.keys());
  const layerMap = new Map<string, Layer>();
  for (const row of rows) {
    for (const layer of row.layers ?? []) {
      if (!songIds.has(layer.songId)) continue;
      layerMap.set(layer.id, layer);
    }
  }

  let profile = local.profile;
  for (const row of rows.slice(1)) {
    profile = mergeProfiles(profile, row.profile ?? {}, userId, email);
  }
  profile = mergeProfiles(profile, {}, userId, email);
  if (rows.some((row) => row.profile?.plan === 'pro')) {
    profile.plan = 'pro';
  }
  profile.deviceId = deviceId;
  profile.syncCode = syncCode;
  profile.authUserId = userId;

  const latestUpdated = rows.reduce(
    (max, row) => Math.max(max, new Date(row.updated_at).getTime()),
    Date.now(),
  );

  return {
    device_id: deviceId,
    sync_code: syncCode,
    user_id: userId,
    profile,
    songs: [...songMap.values()],
    layers: [...layerMap.values()],
    updated_at: new Date(latestUpdated).toISOString(),
  };
}

export function resetDeviceSyncPull(): void {
  pullComplete = false;
}

export function isDeviceSyncReady(): boolean {
  return pullComplete;
}

export function getLocalSyncCode(): string | null {
  const stored = localStorage.getItem(SYNC_CODE_KEY);
  if (stored) return stored;
  return getUserProfile().syncCode ?? null;
}

export function getSyncCodeFromSearch(search: string): string | null {
  const code = new URLSearchParams(search).get('sync')?.trim().toUpperCase();
  if (!code || code.length < 6) return null;
  return code;
}

function ensureLocalSyncCode(): string {
  const existing = getLocalSyncCode();
  if (existing) return existing;
  const code = generateShareCode();
  localStorage.setItem(SYNC_CODE_KEY, code);
  const profile = getUserProfile();
  saveUserProfile({ ...profile, syncCode: code });
  return code;
}

function getExampleSongIds(): Set<string> {
  return new Set(getAllSongs().filter((s) => s.isExample).map((s) => s.id));
}

export function applyBackupLocally(backup: DeviceBackupRow): void {
  const syncCode = backup.sync_code || backup.profile.syncCode || ensureLocalSyncCode();
  localStorage.setItem(SYNC_CODE_KEY, syncCode);
  saveUserProfile({
    ...backup.profile,
    deviceId: backup.device_id,
    syncCode,
  });

  const exampleIds = getExampleSongIds();
  const remoteSongs = (backup.songs ?? []).filter((s) => !s.isExample);
  const localExamples = getAllSongs().filter((s) => s.isExample);
  replaceAllSongs([...localExamples, ...remoteSongs]);

  const remoteSongIds = new Set(remoteSongs.map((s) => s.id));
  const exampleLayers = getAllLayers().filter((l) => exampleIds.has(l.songId));
  const remoteLayers = (backup.layers ?? []).filter((l) => remoteSongIds.has(l.songId));
  replaceAllLayers([...exampleLayers, ...remoteLayers]);

  if (backup.updated_at) {
    localStorage.setItem(LAST_PUSH_KEY, backup.updated_at);
  }
}

async function fetchBackupByUserId(userId: string): Promise<DeviceBackupRow | null> {
  const rows = await supabaseGet<DeviceBackupRow[]>(
    `device_backups?user_id=eq.${encodeURIComponent(userId)}&select=*`,
  );
  return rows?.[0] ?? null;
}

async function fetchBackupBySyncCode(syncCode: string): Promise<DeviceBackupRow | null> {
  const rows = await supabaseGet<DeviceBackupRow[]>(
    `device_backups?sync_code=eq.${encodeURIComponent(syncCode)}&select=*`,
  );
  return rows?.[0] ?? null;
}

async function fetchBackupByDeviceId(deviceId: string): Promise<DeviceBackupRow | null> {
  const rows = await supabaseGet<DeviceBackupRow[]>(
    `device_backups?device_id=eq.${encodeURIComponent(deviceId)}&select=*`,
  );
  return rows?.[0] ?? null;
}

function shouldApplyRemote(remoteUpdatedAt: string): boolean {
  const localPushedAt = localStorage.getItem(LAST_PUSH_KEY);
  if (!localPushedAt) return true;
  return new Date(remoteUpdatedAt).getTime() > new Date(localPushedAt).getTime();
}

export async function linkAuthUser(userId: string, email?: string): Promise<void> {
  const profile = getUserProfile();
  const deviceId = profile.deviceId || ensureDeviceId();
  saveUserProfile({
    ...profile,
    authUserId: userId,
    billingEmail: profile.billingEmail || email,
  });

  const [remoteByUser, remoteByDevice] = await Promise.all([
    fetchBackupByUserId(userId),
    fetchBackupByDeviceId(deviceId),
  ]);
  const local = snapshotLocalBackup(deviceId);
  const merged = mergeDeviceBackups([local, remoteByUser, remoteByDevice], userId, email);

  applyBackupLocally(merged);
  await pushDeviceBackup(userId);

  const { syncProPlanFromServer } = await import('@/lib/billing');
  await syncProPlanFromServer(deviceId, email ?? merged.profile.billingEmail);
  await pushDeviceBackup(userId);

  pullComplete = true;
}

export async function pullDeviceBackup(search = window.location.search): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    pullComplete = true;
    return false;
  }
  if (pullComplete) return false;

  try {
    const profile = getUserProfile();
    if (profile.authUserId) {
      const deviceId = profile.deviceId || ensureDeviceId();
      const [byUser, byDevice] = await Promise.all([
        fetchBackupByUserId(profile.authUserId),
        fetchBackupByDeviceId(deviceId),
      ]);
      const local = snapshotLocalBackup(deviceId);
      const merged = mergeDeviceBackups(
        [local, byUser, byDevice],
        profile.authUserId,
        profile.billingEmail,
      );
      if (byUser || byDevice || local.songs.length > 0) {
        applyBackupLocally(merged);
        const { syncProPlanFromServer } = await import('@/lib/billing');
        await syncProPlanFromServer(deviceId, profile.billingEmail);
        await pushDeviceBackup(profile.authUserId);
        return true;
      }
      return false;
    }

    const urlSyncCode = getSyncCodeFromSearch(search);
    if (urlSyncCode) {
      const byCode = await fetchBackupBySyncCode(urlSyncCode);
      if (byCode) {
        applyBackupLocally(byCode);
        return true;
      }
    }

    const deviceId = ensureDeviceId();
    const byDevice = await fetchBackupByDeviceId(deviceId);
    if (byDevice && shouldApplyRemote(byDevice.updated_at)) {
      applyBackupLocally(byDevice);
      return true;
    }
  } finally {
    pullComplete = true;
  }

  return false;
}

export async function pushDeviceBackup(forcedUserId?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !pullComplete) return false;

  const profile = getUserProfile();
  const deviceId = profile.deviceId || ensureDeviceId();
  const syncCode = ensureLocalSyncCode();
  const userId = forcedUserId ?? profile.authUserId;
  const songs = getAllSongs().filter((s) => !s.isExample);
  const songIds = new Set(songs.map((s) => s.id));
  const layers = getAllLayers().filter((l) => songIds.has(l.songId));
  const updatedAt = new Date().toISOString();

  const payload = {
    device_id: deviceId,
    sync_code: syncCode,
    user_id: userId ?? null,
    profile: { ...profile, deviceId, syncCode, authUserId: userId },
    songs,
    layers,
    updated_at: updatedAt,
  };

  let ok = false;
  if (userId) {
    const existingByUser = await fetchBackupByUserId(userId);
    if (existingByUser) {
      ok = await supabasePatch(
        `device_backups?user_id=eq.${encodeURIComponent(userId)}`,
        {
          sync_code: syncCode,
          profile: payload.profile,
          songs: payload.songs,
          layers: payload.layers,
          updated_at: updatedAt,
        },
      );
    } else {
      const existingByDevice = await fetchBackupByDeviceId(deviceId);
      if (existingByDevice) {
        ok = await supabasePatch(
          `device_backups?device_id=eq.${encodeURIComponent(deviceId)}`,
          payload,
        );
      } else {
        ok = await supabaseInsert('device_backups', payload);
      }
    }
  } else {
    ok = await supabaseUpsert('device_backups', payload, 'device_id');
  }
  if (ok) {
    localStorage.setItem(LAST_PUSH_KEY, updatedAt);
  }
  return ok;
}

export function scheduleDeviceBackup(): void {
  if (!isSupabaseConfigured() || !pullComplete) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushDeviceBackup();
  }, 1200);
}

/** 共有URL用 — 他ブラウザ（LINE / X 等）から同じデータを復元する */
export function buildUrlWithSync(path: string): string {
  const syncCode = getLocalSyncCode();
  if (!syncCode) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set('sync', syncCode);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function attachSyncCodeToUrl(): void {
  if (getUserProfile().authUserId) return;
  const syncCode = getLocalSyncCode();
  if (!syncCode) return;
  const url = new URL(window.location.href);
  if (/^\/(sitemap\.xml|robots\.txt)$/.test(url.pathname)) return;
  if (url.searchParams.get('sync') === syncCode) return;
  url.searchParams.set('sync', syncCode);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getShareUrlWithSync(sharePath: string): string {
  const path = sharePath.startsWith('http')
    ? sharePath
    : `${window.location.origin}${sharePath.startsWith('/') ? sharePath : `/${sharePath}`}`;
  const url = new URL(path);
  if (!getUserProfile().authUserId) {
    const syncCode = getLocalSyncCode();
    if (syncCode) url.searchParams.set('sync', syncCode);
  }
  return url.toString();
}
