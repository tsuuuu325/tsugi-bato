import type { Song, Layer, UserProfile } from '@/types';
import { generateShareCode } from '@/types';
import { getUserProfile, saveUserProfile, ensureDeviceId } from '@/lib/profile';
import {
  getAllSongs,
  getAllLayers,
  replaceAllSongs,
  replaceAllLayers,
} from '@/lib/storage';
import { isSupabaseConfigured, supabaseGet, supabaseUpsert } from '@/lib/supabase';

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
  saveUserProfile({
    ...profile,
    authUserId: userId,
    billingEmail: profile.billingEmail || email,
  });

  const remote = await fetchBackupByUserId(userId);
  const localHasData = getAllSongs().some((s) => !s.isExample);

  if (remote && shouldApplyRemote(remote.updated_at)) {
    applyBackupLocally(remote);
  } else if (localHasData || profile.username.trim()) {
    await pushDeviceBackup(userId);
  }

  pullComplete = true;
}

export async function pullDeviceBackup(search = window.location.search): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    pullComplete = true;
    return false;
  }

  try {
    const profile = getUserProfile();
    if (profile.authUserId) {
      const byUser = await fetchBackupByUserId(profile.authUserId);
      if (byUser && shouldApplyRemote(byUser.updated_at)) {
        applyBackupLocally(byUser);
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

  const ok = userId
    ? await supabaseUpsert('device_backups', payload, 'user_id')
    : await supabaseUpsert('device_backups', payload, 'device_id');
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
