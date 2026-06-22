import { fetchFeedSongs } from '@/lib/feed';
import { getAllSongs, getSongWithLayers } from '@/lib/storage';
import type { FeedSong, Layer } from '@/types';
import {
  formatContributorNames,
  getEffectiveSectionCount,
  getSectionBpms,
  userContributedToSong,
} from '@/types';

export interface MySongEntry {
  id: string;
  shareCode: string;
  title: string;
  layers: Layer[];
  bpm: number;
  referenceBpm?: number;
  sectionBpms?: number[];
  sectionCount: number;
  status: 'open' | 'complete';
  updatedAt: string;
  completedAt?: string;
  source: 'local' | 'feed';
}

function toEntry(
  song: {
    id: string;
    shareCode: string;
    title: string;
    bpm: number;
    referenceBpm?: number;
    sectionBpms?: number[];
    sectionCount: number;
    status: 'open' | 'complete';
    updatedAt: string;
    completedAt?: string;
    layers: Layer[];
  },
  source: 'local' | 'feed',
): MySongEntry {
  return {
    id: song.id,
    shareCode: song.shareCode,
    title: song.title,
    layers: song.layers.filter((l) => !l.isVirtual),
    bpm: song.bpm,
    referenceBpm: song.referenceBpm,
    sectionBpms: song.sectionBpms,
    sectionCount: song.sectionCount,
    status: song.status,
    updatedAt: song.updatedAt,
    completedAt: song.completedAt,
    source,
  };
}

export function getLocalMySongs(deviceId: string): MySongEntry[] {
  if (!deviceId) return [];
  return getAllSongs()
    .map((song) => getSongWithLayers(song.id))
    .filter((song): song is NonNullable<typeof song> => Boolean(song))
    .filter((song) => userContributedToSong(song.layers, deviceId))
    .map((song) => toEntry(song, 'local'))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function feedToEntry(song: FeedSong): MySongEntry {
  const sectionCount = Math.max(1, ...song.layers.map((l) => (l.sectionIndex ?? 0) + 1));
  return toEntry(
    {
      id: song.id,
      shareCode: song.shareCode,
      title: song.title,
      bpm: song.bpm,
      referenceBpm: song.referenceBpm,
      sectionBpms: song.sectionBpms,
      sectionCount,
      status: 'complete',
      updatedAt: song.completedAt,
      completedAt: song.completedAt,
      layers: song.layers,
    },
    'feed',
  );
}

export async function getFeedMySongs(deviceId: string): Promise<MySongEntry[]> {
  if (!deviceId) return [];
  const feed = await fetchFeedSongs();
  return feed
    .filter((song) => userContributedToSong(song.layers, deviceId))
    .map(feedToEntry);
}

export function mergeMySongs(local: MySongEntry[], feed: MySongEntry[]): MySongEntry[] {
  const byId = new Map<string, MySongEntry>();
  for (const song of feed) byId.set(song.id, song);
  for (const song of local) byId.set(song.id, song);
  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.completedAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.completedAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export function mySongMeta(entry: MySongEntry): {
  sectionCount: number;
  sectionBpms: number[];
  contributorNames: string;
} {
  const sectionCount = getEffectiveSectionCount(
    { sectionCount: entry.sectionCount, bpm: entry.bpm, sectionBpms: entry.sectionBpms },
    entry.layers,
  );
  const sectionBpms = entry.sectionBpms ?? getSectionBpms({ bpm: entry.bpm, sectionCount });
  return {
    sectionCount,
    sectionBpms,
    contributorNames: formatContributorNames(entry.layers),
  };
}
