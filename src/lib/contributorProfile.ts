import { countLikesForSongs, fetchFeedSongs } from '@/lib/feed';
import type { FeedSong, Layer } from '@/types';
import {
  formatContributorNames,
  getEffectiveSectionCount,
  getLayerContributorKey,
  getSectionBpms,
} from '@/types';
import type { MySongEntry } from '@/lib/mySongs';

export interface ContributorProfile {
  id: string;
  name: string;
  avatar: string;
  likeCount: number;
  songs: MySongEntry[];
}

function feedSongToEntry(song: FeedSong): MySongEntry {
  const sectionCount = Math.max(1, ...song.layers.map((l) => (l.sectionIndex ?? 0) + 1));
  return {
    id: song.id,
    shareCode: song.shareCode,
    title: song.title,
    layers: song.layers.filter((l) => !l.isVirtual),
    bpm: song.bpm,
    referenceBpm: song.referenceBpm,
    sectionBpms: song.sectionBpms,
    sectionCount,
    status: 'complete',
    updatedAt: song.completedAt,
    completedAt: song.completedAt,
    source: 'feed',
  };
}

export function buildContributorPath(contributorKey: string): string {
  return `/u/${encodeURIComponent(contributorKey)}`;
}

export function layerMatchesContributor(layer: Layer, contributorKey: string): boolean {
  if (layer.isVirtual) return false;
  const decoded = decodeURIComponent(contributorKey);
  return getLayerContributorKey(layer) === decoded;
}

export function buildContributorProfile(
  feed: FeedSong[],
  contributorKey: string,
): ContributorProfile | null {
  const decoded = decodeURIComponent(contributorKey);
  let name = '';
  let avatar = '🎧';
  const songs: MySongEntry[] = [];

  for (const song of feed) {
    const userLayers = song.layers.filter((l) => layerMatchesContributor(l, decoded));
    if (userLayers.length === 0) continue;

    name = userLayers[0].contributorName;
    if (userLayers[0].contributorAvatar) avatar = userLayers[0].contributorAvatar;
    songs.push(feedSongToEntry(song));
  }

  if (songs.length === 0) return null;

  songs.sort((a, b) => {
    const aTime = new Date(a.completedAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.completedAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });

  return {
    id: decoded,
    name: name || decoded,
    avatar,
    likeCount: 0,
    songs,
  };
}

export async function fetchContributorProfile(contributorKey: string): Promise<ContributorProfile | null> {
  const feed = await fetchFeedSongs();
  const profile = buildContributorProfile(feed, contributorKey);
  if (!profile) return null;
  const likeCount = await countLikesForSongs(profile.songs.map((song) => song.id));
  return { ...profile, likeCount };
}

export function contributorSongMeta(entry: MySongEntry): {
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
