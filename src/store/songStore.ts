import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Song, SongWithLayers, SongMode, LayerAddMode } from '@/types';
import { getExampleSongs, seedExampleBeats, refreshExamplePatterns } from '@/data/exampleBeats';
import {
  MAX_CONTRIBUTORS,
  DEFAULT_BARS,
  MIN_BPM,
  MAX_BPM,
  generateShareCode,
  canUserAddLayer,
  canExtendSection,
  getLockedAddMode,
  getUserLayers,
  isCreatorLayeringSession,
  hasExtendedInCurrentSession,
  canUserExtendSection,
  getSectionBpms,
  getSectionTotalSteps,
  resizeStepPattern,
  foldPatternToCanonical,
} from '@/types';
import {
  getOpenSongs,
  getCompletedSongs,
  getSongWithLayers,
  getSongWithLayersByCode,
  saveSong,
  saveLayer,
  updateLayer,
  getAllLayers,
  getLayersForSong,
  deleteLayer,
  deleteSong,
  purgeOpenSongs,
  seedDemoData,
  migrateLegacyData,
  migrateStorageVersion,
} from '@/lib/storage';
import {
  getUserProfile,
  saveUserProfile,
  getAvatarEmoji,
  getDeviceId,
  ensureDeviceId,
} from '@/lib/profile';
import {
  canCreateSong,
  canJoinSong,
  canStartDailyLayerSession,
  canStartDailySessionForMode,
  getMaxSections,
  MIN_TIMELINE_SECTIONS,
  recordDailyLayerSession,
  recordDailyExtendSession,
  isSongCreator,
} from '@/lib/plan';
import { publishSongToFeed } from '@/lib/feed';
import { pullDeviceBackup, scheduleDeviceBackup, attachSyncCodeToUrl, pushDeviceBackup } from '@/lib/deviceSync';
import { assertCanCreateMusic } from '@/lib/authGate';
import { isSupabaseConfigured } from '@/lib/supabase';
import { waitForAuthReady } from '@/lib/authReady';
import { VIRTUAL_PART_LOOP_ID } from '@/data/loops';
import { t as i18nT } from '@/i18n/core';
import { getDefaultPattern, resolveLayerPattern, getCanonicalPatternLengthForPad } from '@/audio/engine';
import type { StepPattern } from '@/types';

interface SongStore {
  username: string;
  avatarEmoji: string;
  deviceId: string;
  openSongs: SongWithLayers[];
  completedSongs: SongWithLayers[];
  exampleSongs: Song[];
  isPlaying: boolean;
  /** Stripe 照会完了まで false。照会後にのみ Pro 判定を反映 */
  proSyncDone: boolean;
  proEntitled: boolean;

  init: () => void;
  setUser: (name: string, avatarEmoji?: string) => void;
  setAvatar: (emoji: string) => void;
  refreshLists: () => void;
  loadSongByCode: (code: string) => SongWithLayers | null;

  createSong: (params: {
    title: string;
    bpm: number;
    foundationLoopId: string;
    mode: SongMode;
    addVirtualPart?: boolean;
  }) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  addLayer: (
    songId: string,
    loopId: string,
    addMode: LayerAddMode,
    sectionBpm?: number,
    targetSectionIndex?: number,
  ) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  finishContribution: (songId: string) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  cancelContribution: (
    songId: string,
  ) => { ok: true; deleted: true } | { ok: true; deleted: false; song: SongWithLayers } | { ok: false; reason: string };

  updateSectionBpm: (
    songId: string,
    sectionIndex: number,
    bpm: number,
  ) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  updateExampleBpm: (
    songId: string,
    bpm: number,
  ) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  toggleLayerStep: (layerId: string, stepIndex: number) => SongWithLayers | null;

  removeLayer: (
    songId: string,
    layerId: string,
  ) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };

  completeSong: (
    songId: string,
    title?: string,
  ) => { ok: true; song: SongWithLayers } | { ok: false; reason: string };
  setPlaying: (playing: boolean) => void;
}

function resolveUsername(storeUsername: string): string {
  return storeUsername || getUserProfile().username || i18nT('app.guest');
}

function resolveAvatar(storeAvatar: string): string {
  return storeAvatar || getAvatarEmoji();
}

function resolveDeviceId(storeDeviceId: string): string {
  return storeDeviceId || getDeviceId();
}

function creationAuthBlock(): { ok: false; reason: string } | null {
  const gate = assertCanCreateMusic();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  return null;
}

async function publishIfComplete(song: SongWithLayers): Promise<void> {
  if (song.status !== 'complete') return;
  const creatorLayer = song.layers[0];
  const creatorAvatar = creatorLayer?.contributorAvatar ?? getAvatarEmoji();
  await publishSongToFeed(song, creatorAvatar);
}

function completeForTimeline(song: SongWithLayers): SongWithLayers {
  if (song.status === 'complete') return song;
  const updated = buildSongUpdate(song, {
    status: 'complete',
    activeContributorId: undefined,
    sectionBpms: getSectionBpms(song),
  });
  saveSong(updated);
  const full = getSongWithLayers(song.id)!;
  void publishIfComplete(full);
  return full;
}

function resizeSectionLayerPatterns(songId: string, sectionIndex: number, sectionBpm: number): void {
  const totalSteps = getSectionTotalSteps(sectionBpm);
  for (const layer of getAllLayers().filter((l) => l.songId === songId && l.sectionIndex === sectionIndex)) {
    const canonicalLen = getCanonicalPatternLengthForPad(layer.loopId);
    const defaultPat = getDefaultPattern(layer.loopId);
    const canonical = layer.pattern?.length
      ? foldPatternToCanonical(layer.pattern, canonicalLen)
      : defaultPat;
    updateLayer(layer.id, { pattern: resizeStepPattern(canonical, totalSteps) });
  }
}

function buildSongUpdate(song: SongWithLayers, overrides: Partial<Song>): Song {
  return {
    id: song.id,
    shareCode: song.shareCode,
    title: song.title,
    bpm: song.bpm,
    maxBars: song.maxBars,
    maxContributors: song.maxContributors,
    status: song.status,
    mode: song.mode,
    challengeTag: song.challengeTag,
    sectionCount: song.sectionCount,
    activeContributorId: song.activeContributorId,
    activeSessionStartedAt: song.activeSessionStartedAt,
    sectionBpms: song.sectionBpms,
    referenceBpm: song.referenceBpm,
    createdAt: song.createdAt,
    updatedAt: new Date().toISOString(),
    creatorName: song.creatorName,
    ...overrides,
  };
}

const PURGE_OPEN_SONGS_KEY = 'tsugi-bato-purged-open-songs-v1';
let storeInitDone = false;

async function refreshBillingEntitlement(deviceId: string, email?: string): Promise<void> {
  const { isBillingConfigured, syncProPlanFromServer } = await import('@/lib/billing');
  if (!isBillingConfigured() || !deviceId) return;
  await syncProPlanFromServer(deviceId, email);
  const profile = getUserProfile();
  void pushDeviceBackup(profile.authUserId);
}

export const useSongStore = create<SongStore>((set, get) => ({
  username: '',
  avatarEmoji: '🎧',
  deviceId: '',
  openSongs: [],
  completedSongs: [],
  exampleSongs: [],
  isPlaying: false,
  proSyncDone: false,
  proEntitled: false,

  init: () => {
    if (storeInitDone) return;
    storeInitDone = true;

    const wipeRemote = migrateStorageVersion();
    seedDemoData();
    seedExampleBeats();
    migrateLegacyData();
    if (!localStorage.getItem(PURGE_OPEN_SONGS_KEY)) {
      purgeOpenSongs();
      localStorage.setItem(PURGE_OPEN_SONGS_KEY, '1');
    }
    if (wipeRemote) {
      void import('@/lib/feed').then(({ clearRemoteFeed }) => clearRemoteFeed());
    }
    const profile = getUserProfile();
    ensureDeviceId();
    set({
      username: profile.username,
      avatarEmoji: profile.avatarEmoji,
      deviceId: profile.deviceId,
    });
    get().refreshLists();
    void (async () => {
      if (isSupabaseConfigured()) {
        await waitForAuthReady();
      }
      const restored = await pullDeviceBackup(window.location.search);
      const nextProfile = getUserProfile();
      set({
        username: nextProfile.username,
        avatarEmoji: nextProfile.avatarEmoji,
        deviceId: nextProfile.deviceId,
      });
      get().refreshLists();
      attachSyncCodeToUrl();
      if (restored) {
        void pushDeviceBackup();
      }
      void refreshBillingEntitlement(nextProfile.deviceId, nextProfile.billingEmail);
    })();
  },

  setUser: (name: string, avatarEmoji?: string) => {
    const emoji = avatarEmoji ?? get().avatarEmoji;
    const deviceId = resolveDeviceId(get().deviceId);
    const existing = (get().username || getUserProfile().username).trim();
    const nextName = existing || name.trim();
    if (!nextName) return;
    saveUserProfile({ deviceId, username: nextName, avatarEmoji: emoji });
    set({ username: nextName, avatarEmoji: emoji, deviceId });
  },

  setAvatar: (emoji: string) => {
    const deviceId = resolveDeviceId(get().deviceId);
    const username = get().username || getUserProfile().username;
    saveUserProfile({ deviceId, username, avatarEmoji: emoji });
    set({ avatarEmoji: emoji });
  },

  refreshLists: () => {
    set({
      openSongs: getOpenSongs(),
      completedSongs: getCompletedSongs(),
      exampleSongs: getExampleSongs(),
    });
    scheduleDeviceBackup();
  },

  loadSongByCode: (code: string) => {
    return getSongWithLayersByCode(code) ?? null;
  },

  createSong: ({ title, bpm, foundationLoopId, mode, addVirtualPart }) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const username = resolveUsername(get().username);
    const avatar = resolveAvatar(get().avatarEmoji);
    const deviceId = resolveDeviceId(get().deviceId);

    if (!canCreateSong(deviceId)) {
      return { ok: false, reason: 'songCreateLimit' };
    }

    if (!canStartDailyLayerSession()) {
      return { ok: false, reason: 'dailyLayerSessionLimit' };
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    const song: Song = {
      id,
      shareCode: generateShareCode(),
      title: title.trim() || 'Untitled Beat',
      bpm,
      referenceBpm: bpm,
      maxBars: DEFAULT_BARS,
      maxContributors: MAX_CONTRIBUTORS,
      status: 'open',
      mode,
      sectionCount: 1,
      sectionBpms: [bpm],
      activeContributorId: deviceId,
      activeSessionStartedAt: now,
      createdAt: now,
      updatedAt: now,
      creatorName: username,
    };

    saveSong(song);

    saveLayer({
      id: uuidv4(),
      songId: id,
      loopId: foundationLoopId,
      contributorId: deviceId,
      contributorName: username,
      contributorAvatar: avatar,
      contributorIndex: 0,
      sectionIndex: 0,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: resizeStepPattern(getDefaultPattern(foundationLoopId), getSectionTotalSteps(bpm)),
    });

    if (addVirtualPart) {
      saveLayer({
        id: uuidv4(),
        songId: id,
        loopId: VIRTUAL_PART_LOOP_ID,
        contributorName: i18nT('app.virtualPart'),
        contributorAvatar: '👻',
        contributorIndex: 1,
        sectionIndex: 0,
        addMode: 'layer',
        isVirtual: true,
        addedAt: now,
        pattern: resizeStepPattern(getDefaultPattern(VIRTUAL_PART_LOOP_ID), getSectionTotalSteps(bpm)),
      });
    }

    const full = getSongWithLayers(id)!;
    get().refreshLists();
    return { ok: true, song: full };
  },

  addLayer: (songId: string, loopId: string, addMode: LayerAddMode, sectionBpm?: number, targetSectionIndex?: number) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }

    const name = resolveUsername(get().username);
    const avatar = resolveAvatar(get().avatarEmoji);
    const deviceId = resolveDeviceId(get().deviceId);

    if (!deviceId) {
      return { ok: false, reason: 'deviceInitFailed' };
    }

    const creatorLayering = isCreatorLayeringSession(song, song.layers, deviceId);
    const effectiveMode: LayerAddMode = creatorLayering ? 'layer' : addMode;

    if (song.activeContributorId !== deviceId) {
      if (!canStartDailySessionForMode(effectiveMode)) {
        return {
          ok: false,
          reason: effectiveMode === 'extend' ? 'dailyExtendSessionLimit' : 'dailyLayerSessionLimit',
        };
      }
    }

    if (!canUserAddLayer(song, song.layers, deviceId)) {
      if (song.activeContributorId && song.activeContributorId !== deviceId) {
        return { ok: false, reason: 'someoneElseAdding' };
      }
      const finished = getUserLayers(song.layers, deviceId).length > 0;
      if (finished) {
        return { ok: false, reason: 'alreadyJoined' };
      }
      return { ok: false, reason: 'cannotAddMore' };
    }

    const lockedMode = getLockedAddMode(song, song.layers, deviceId);
    if (lockedMode && effectiveMode !== lockedMode) {
      return {
        ok: false,
        reason: lockedMode === 'layer'
          ? 'layerModeOnly'
          : 'extendModeOnly',
      };
    }

    const userLayers = getUserLayers(song.layers, deviceId);
    const maxSections = getMaxSections();
    const extendedThisSession = effectiveMode === 'extend'
      ? hasExtendedInCurrentSession(song, song.layers, deviceId)
      : false;

    if (!canJoinSong(song.layers, songId, deviceId) && userLayers.length === 0 && !isCreatorLayeringSession(song, song.layers, deviceId)) {
      return { ok: false, reason: 'joinSongLimit' };
    }

    if (effectiveMode === 'extend' && !extendedThisSession) {
      if (!canUserExtendSection(song, song.layers, deviceId, maxSections)) {
        return { ok: false, reason: 'alreadyExtended' };
      }
      if (!canExtendSection(song.sectionCount, maxSections)) {
        return { ok: false, reason: 'sectionLimit' };
      }
    }

    const usedLoopIds = new Set(song.layers.map((l) => l.loopId));
    if (usedLoopIds.has(loopId)) {
      return { ok: false, reason: 'padAlreadyUsed' };
    }

    let sectionIndex: number;
    let newSectionCount = song.sectionCount;
    let sectionBpms = [...(song.sectionBpms ?? Array(song.sectionCount).fill(song.bpm))];

    if (effectiveMode === 'layer') {
      sectionIndex = targetSectionIndex ?? song.sectionCount - 1;
      if (sectionIndex < 0 || sectionIndex >= song.sectionCount) {
        return { ok: false, reason: 'sectionNotFound' };
      }
      if (sectionBpm != null) {
        if (sectionBpm < MIN_BPM || sectionBpm > MAX_BPM) {
          return { ok: false, reason: `bpmOutOfRange|${MIN_BPM}|${MAX_BPM}` };
        }
        sectionBpms[sectionIndex] = sectionBpm;
      }
    } else {
      if (!extendedThisSession) {
        const bpm = sectionBpm ?? song.sectionBpms?.[song.sectionCount] ?? song.bpm;
        if (bpm < MIN_BPM || bpm > MAX_BPM) {
          return { ok: false, reason: `bpmOutOfRange|${MIN_BPM}|${MAX_BPM}` };
        }
        sectionIndex = song.sectionCount;
        newSectionCount = song.sectionCount + 1;
        if (newSectionCount > maxSections) {
          return { ok: false, reason: 'sectionLimit' };
        }
        sectionBpms = [...getSectionBpms(song), bpm];
      } else {
        sectionIndex = song.sectionCount - 1;
      }
    }

    const now = new Date().toISOString();
    const startingSession = song.activeContributorId !== deviceId;
    const activeContributorId = deviceId;

    const layerSectionBpm = sectionBpms[sectionIndex] ?? song.bpm;

    saveLayer({
      id: uuidv4(),
      songId,
      loopId,
      contributorId: deviceId,
      contributorName: name,
      contributorAvatar: avatar,
      contributorIndex: song.layers.length,
      sectionIndex,
      addMode: effectiveMode,
      isVirtual: false,
      addedAt: now,
      pattern: resizeStepPattern(
        getDefaultPattern(loopId),
        getSectionTotalSteps(layerSectionBpm),
      ),
    });

    const updatedSong = buildSongUpdate(song, {
      sectionCount: newSectionCount,
      sectionBpms,
      activeContributorId,
      activeSessionStartedAt: startingSession ? now : song.activeSessionStartedAt,
    });

    saveSong(updatedSong);

    const full = getSongWithLayers(songId)!;
    get().refreshLists();
    return { ok: true, song: full };
  },

  updateSectionBpm: (songId: string, sectionIndex: number, bpm: number) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }
    if (bpm < MIN_BPM || bpm > MAX_BPM) {
      return { ok: false, reason: `bpmOutOfRange|${MIN_BPM}|${MAX_BPM}` };
    }
    if (sectionIndex < 0 || sectionIndex > song.sectionCount) {
      return { ok: false, reason: 'sectionNotFound' };
    }

    const sectionBpms = [...(song.sectionBpms ?? Array(song.sectionCount).fill(song.bpm))];
    while (sectionBpms.length < song.sectionCount) {
      sectionBpms.push(song.bpm);
    }

    if (sectionIndex === song.sectionCount) {
      if (sectionBpms.length > song.sectionCount) {
        sectionBpms[sectionIndex] = bpm;
      } else {
        sectionBpms.push(bpm);
      }
    } else {
      sectionBpms[sectionIndex] = bpm;
    }

    const updatedSong = buildSongUpdate(song, {
      sectionBpms,
    });
    saveSong(updatedSong);

    if (sectionIndex < song.sectionCount) {
      resizeSectionLayerPatterns(songId, sectionIndex, bpm);
    }

    const full = getSongWithLayers(songId)!;
    get().refreshLists();
    return { ok: true, song: full };
  },

  updateExampleBpm: (songId: string, bpm: number) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }
    if (!song.isExample) {
      return { ok: false, reason: 'notExample' };
    }
    if (bpm < MIN_BPM || bpm > MAX_BPM) {
      return { ok: false, reason: `bpmOutOfRange|${MIN_BPM}|${MAX_BPM}` };
    }

    const sectionBpms = Array.from({ length: song.sectionCount }, () => bpm);
    saveSong(buildSongUpdate(song, { bpm, sectionBpms }));
    refreshExamplePatterns(songId, bpm);

    const full = getSongWithLayers(songId)!;
    get().refreshLists();
    return { ok: true, song: full };
  },

  finishContribution: (songId: string) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }

    const deviceId = resolveDeviceId(get().deviceId);
    if (song.activeContributorId !== deviceId) {
      return { ok: false, reason: 'notYourSession' };
    }

    const userLayers = getUserLayers(song.layers, deviceId);
    if (userLayers.length === 0) {
      return { ok: false, reason: 'noLayersAdded' };
    }

    const updatedSong = buildSongUpdate(song, {
      activeContributorId: undefined,
      activeSessionStartedAt: undefined,
      sectionBpms: getSectionBpms(song),
    });

    saveSong(updatedSong);

    const sessionMode = getLockedAddMode(song, song.layers, deviceId) ?? 'layer';
    if (sessionMode === 'extend') {
      recordDailyExtendSession();
    } else {
      recordDailyLayerSession();
    }

    const full = getSongWithLayers(songId)!;
    get().refreshLists();

    return { ok: true, song: full };
  },

  cancelContribution: (songId: string) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }
    if (song.isExample) {
      return { ok: false, reason: 'cannotCancelExample' };
    }
    if (song.status === 'complete') {
      return { ok: false, reason: 'cannotCancelComplete' };
    }

    const deviceId = resolveDeviceId(get().deviceId);
    if (song.activeContributorId !== deviceId) {
      return { ok: false, reason: 'notYourSession' };
    }

    const sessionStartedAt = song.activeSessionStartedAt ?? song.createdAt;
    const sessionLayers = getUserLayers(song.layers, deviceId).filter(
      (l) => l.addedAt >= sessionStartedAt,
    );
    if (sessionLayers.length === 0) {
      return { ok: false, reason: 'noLayersAdded' };
    }

    for (const layer of sessionLayers) {
      deleteLayer(layer.id);
    }

    const remaining = getLayersForSong(songId);
    const realRemaining = remaining.filter((l) => !l.isVirtual);
    const otherContributors = remaining.some(
      (l) => !l.isVirtual && l.contributorId && l.contributorId !== deviceId,
    );

    if (realRemaining.length === 0 || (isSongCreator(song.layers, deviceId) && !otherContributors)) {
      deleteSong(songId);
      get().refreshLists();
      return { ok: true, deleted: true };
    }

    const newSectionCount = Math.min(
      Math.max(1, ...remaining.map((l) => l.sectionIndex + 1)),
      getMaxSections(),
    );
    const updatedSong = buildSongUpdate(song, {
      sectionCount: newSectionCount,
      sectionBpms: getSectionBpms({ ...song, sectionCount: newSectionCount }).slice(0, newSectionCount),
      activeContributorId: undefined,
      activeSessionStartedAt: undefined,
    });
    saveSong(updatedSong);

    const full = getSongWithLayers(songId)!;
    get().refreshLists();
    return { ok: true, deleted: false, song: full };
  },

  removeLayer: (songId: string, layerId: string) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    const song = getSongWithLayers(songId);
    if (!song) {
      return { ok: false, reason: 'songNotFound' };
    }

    const deviceId = resolveDeviceId(get().deviceId);
    const layer = song.layers.find((l) => l.id === layerId);
    if (!layer) {
      return { ok: false, reason: 'layerNotFound' };
    }
    if (layer.isVirtual) {
      return { ok: false, reason: 'cannotDeleteVirtual' };
    }
    if (layer.contributorId !== deviceId) {
      return { ok: false, reason: 'notYourLayer' };
    }
    if (song.activeContributorId !== deviceId) {
      return { ok: false, reason: 'notYourSessionDelete' };
    }

    const realLayers = song.layers.filter((l) => !l.isVirtual);
    if (realLayers.length <= 1) {
      return { ok: false, reason: 'cannotDeleteLastLayer' };
    }

    deleteLayer(layerId);

    const remaining = getLayersForSong(songId);
    const newSectionCount = Math.min(
      Math.max(1, ...remaining.map((l) => l.sectionIndex + 1)),
      getMaxSections(),
    );
    const sectionBpms = getSectionBpms(song).slice(0, newSectionCount);
    const userLayersLeft = getUserLayers(remaining, deviceId);

    const updatedSong = buildSongUpdate(song, {
      sectionCount: newSectionCount,
      sectionBpms,
      activeContributorId: userLayersLeft.length > 0 ? deviceId : undefined,
    });
    saveSong(updatedSong);

    const full = getSongWithLayers(songId)!;
    get().refreshLists();
    return { ok: true, song: full };
  },

  toggleLayerStep: (layerId: string, stepIndex: number) => {
    if (creationAuthBlock()) return null;

    const layer = getAllLayers().find((l) => l.id === layerId);
    if (!layer) return null;

    const song = getSongWithLayers(layer.songId);
    if (!song) return null;

    const bpms = getSectionBpms(song);
    const bpm = bpms[layer.sectionIndex] ?? song.bpm;
    const totalSteps = getSectionTotalSteps(bpm);
    if (stepIndex < 0 || stepIndex >= totalSteps) return null;

    const current = resolveLayerPattern(layer.loopId, layer.pattern, bpm);
    const next = [...current] as StepPattern;
    next[stepIndex] = next[stepIndex] ? 0 : 1;

    updateLayer(layerId, { pattern: next });

    const updated = getSongWithLayers(layer.songId);
    if (updated) get().refreshLists();
    return updated ?? null;
  },

  completeSong: (songId: string, title?: string) => {
    const blocked = creationAuthBlock();
    if (blocked) return blocked;

    let song = getSongWithLayers(songId);
    if (!song) return { ok: false as const, reason: 'songNotFound' };
    if (song.sectionCount < MIN_TIMELINE_SECTIONS) {
      return { ok: false as const, reason: 'timelineNeedsSections' };
    }
    if (title?.trim()) {
      const trimmed = title.trim().slice(0, 40);
      saveSong({ ...song, title: trimmed, updatedAt: new Date().toISOString() });
      song = getSongWithLayers(songId)!;
    }
    if (song.status === 'complete') {
      return { ok: true as const, song };
    }
    const full = completeForTimeline(song);
    get().refreshLists();
    return { ok: true as const, song: full };
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
}));
