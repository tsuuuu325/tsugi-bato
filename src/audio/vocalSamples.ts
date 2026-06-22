/** ロングボーカル用の実音声サンプル（英語歌詞） */
export interface VocalSampleMeta {
  id: string;
  path: string;
  lyric: string;
}

export const VOCAL_SAMPLES: Record<string, VocalSampleMeta> = {
  drift: {
    id: 'drift',
    path: '/audio/vocals/drift.mp3',
    lyric: 'I drift in the dark tonight. Smoke in the air.',
  },
  smoke: {
    id: 'smoke',
    path: '/audio/vocals/smoke.mp3',
    lyric: 'Smoke in the air. I cannot see. Lost in the night.',
  },
  yeah: {
    id: 'yeah',
    path: '/audio/vocals/yeah.mp3',
    lyric: 'Yeah. Yeah yeah. Ride that beat all night.',
  },
  dark: {
    id: 'dark',
    path: '/audio/vocals/dark.mp3',
    lyric: 'Born in the dark. We ride. We never stop.',
  },
  ride: {
    id: 'ride',
    path: '/audio/vocals/ride.mp3',
    lyric: 'Ride ride ride. Do not stop. Feel the bass drop.',
  },
};

export function getVocalSample(id: string): VocalSampleMeta | undefined {
  return VOCAL_SAMPLES[id];
}
