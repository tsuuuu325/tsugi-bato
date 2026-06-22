/**
 * Phonk / EDM Drum Pad Engine — Web Audio API
 */

import { getPadById } from '@/data/loops';
import { ensureVocalSamplesLoaded, getSampleBuffer } from '@/audio/sampleLoader';
import type { StepPattern } from '@/types';
import { STEPS_PER_BAR, LONG_LOOP_STEPS, LONG_LOOP_BARS, BEATS_PER_BAR, DEFAULT_BPM, getSectionStepMs, getAbsoluteSpeedRatio, getSectionTotalSteps, resizeStepPattern } from '@/types';

export type { StepPattern };

export interface PlaybackPosition {
  section: number;
  step: number;
}

type StepListener = (pos: PlaybackPosition) => void;

export interface PlayTrack {
  padId: string;
  pattern: StepPattern;
  sectionIndex: number;
}

interface PresetConfig {
  kind: 'kick' | 'hat' | 'snare' | 'clap' | 'bass' | 'synth' | 'fx' | 'perc' | 'cowbell' | 'vinyl' | 'reese' | 'vocal' | 'sample';
  pattern: StepPattern;
  notes?: number[];
  volume: number;
  release: number;
  pitch?: number;
  fxStyle?: 'gun' | 'siren' | 'reverse';
  vocalStyle?: 'human' | 'robot' | 'phonk';
  /** 実音声サンプルID（kind: sample） */
  sampleId?: string;
}

function pat(...steps: number[]): StepPattern {
  const p = Array(16).fill(0) as StepPattern;
  steps.forEach((s) => { if (s >= 0 && s < 16) p[s] = 1; });
  return p;
}

function every(n: number): StepPattern {
  const p = Array(16).fill(0) as StepPattern;
  for (let i = 0; i < 16; i += n) p[i] = 1;
  return p;
}

/** 4小節分のステップパターン（各小節16ステップ） */
function pat4(b0: number[], b1?: number[], b2?: number[], b3?: number[]): StepPattern {
  const bars = [b0, b1 ?? b0, b2 ?? b0, b3 ?? b1 ?? b0];
  const p = Array(LONG_LOOP_STEPS).fill(0) as StepPattern;
  bars.forEach((steps, bi) => {
    for (const s of steps) {
      if (s >= 0 && s < STEPS_PER_BAR) p[bi * STEPS_PER_BAR + s] = 1;
    }
  });
  return p;
}

/** 4小節とも同じリズム */
function pat4steady(...steps: number[]): StepPattern {
  return pat4(steps);
}

function notes4steady(bar: number[]): number[] {
  return notes4(bar);
}

function notes4(b0: number[], b1?: number[], b2?: number[], b3?: number[]): number[] {
  const bars = [b0, b1 ?? b0, b2 ?? b0, b3 ?? b1 ?? b0];
  const out: number[] = [];
  for (const bar of bars) {
    for (let i = 0; i < STEPS_PER_BAR; i++) {
      out.push(bar[i] ?? bar[bar.length - 1] ?? 36);
    }
  }
  return out;
}

/** 4小節ループの先頭で1回だけサンプルを鳴らす */
function patLoopStart(): StepPattern {
  const p = Array(LONG_LOOP_STEPS).fill(0) as StepPattern;
  p[0] = 1;
  return p;
}

function barNotes(...values: number[]): number[] {
  const out = Array(STEPS_PER_BAR).fill(values[values.length - 1] ?? 36) as number[];
  values.forEach((v, i) => { if (i < STEPS_PER_BAR) out[i] = v; });
  return out;
}

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

let masterGain: GainNode | null = null;
let masterClip: WaveShaperNode | null = null;

function getMasterOut(ctx: AudioContext): AudioNode {
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.82;
    masterClip = ctx.createWaveShaper();
    masterClip.curve = makeDistortionCurve(12);
    masterClip.oversample = '2x';
    masterGain.connect(masterClip);
    masterClip.connect(ctx.destination);
  }
  return masterGain;
}

function connectToOut(ctx: AudioContext, node: AudioNode): void {
  node.connect(getMasterOut(ctx));
}

function noiseBurst(ctx: AudioContext, t: number, duration: number, volume: number, hp = 0): void {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  if (hp > 0) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    src.connect(f);
    f.connect(g);
  } else {
    src.connect(g);
  }
  connectToOut(ctx, g);
  src.start(t);
}

const PRESETS: Record<string, PresetConfig> = {
  // Foundation — 808 / cowbell
  kick_4x4: { kind: 'kick', pattern: pat(0, 4, 8, 12), volume: 0.95, release: 0.55 },
  kick_punch: { kind: 'kick', pattern: pat(0, 3, 6, 8, 11, 14), volume: 0.92, release: 0.5 },
  sub_edm: { kind: 'bass', pattern: pat(0, 2, 4, 6, 8, 10, 12, 14), notes: [36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 38, 36, 36], volume: 0.82, release: 0.45 },
  clap_edm: { kind: 'cowbell', pattern: pat(0, 2, 4, 6, 8, 10, 12, 14), pitch: 880, volume: 0.55, release: 0.12 },

  // Hats & texture
  hat_closed: { kind: 'hat', pattern: pat(2, 6, 10, 14), volume: 0.32, release: 0.035 },
  hat_open: { kind: 'hat', pattern: pat(6, 14), volume: 0.38, release: 0.14 },
  ride: { kind: 'hat', pattern: every(1), volume: 0.16, release: 0.025 },
  shaker: { kind: 'vinyl', pattern: pat(0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15), volume: 0.14, release: 0.06 },

  // Drums
  snare_edm: { kind: 'snare', pattern: pat(4, 12), volume: 0.72, release: 0.14 },
  rim: { kind: 'snare', pattern: pat(2, 6, 10, 14), volume: 0.28, release: 0.05 },
  tom: { kind: 'perc', pattern: pat(3, 7, 11, 15), volume: 0.48, release: 0.22 },
  conga: { kind: 'perc', pattern: pat(1, 5, 9, 13), volume: 0.4, release: 0.1 },

  // Dark synth & FX
  stab: { kind: 'synth', pattern: pat(0, 4, 8, 12), notes: [44, 44, 44, 44, 44, 44, 44, 44, 46, 46, 46, 46, 46, 46, 46, 46], volume: 0.42, release: 0.2 },
  pluck: { kind: 'cowbell', pattern: pat(0, 3, 6, 8, 11, 14), pitch: 660, volume: 0.38, release: 0.1 },
  riser: { kind: 'fx', pattern: pat(12, 13, 14, 15), volume: 0.35, release: 0.35 },
  crash: { kind: 'fx', pattern: pat(0), volume: 0.5, release: 0.45 },

  // Long loops — 4小節（64ステップ）・長めのリリース
  long_pad: {
    kind: 'synth',
    pattern: pat4([0], [0, 8], [0, 4, 12], [0, 8, 14]),
    notes: notes4(barNotes(37, 37, 37, 37, 37, 37, 37, 37, 39, 39, 39, 39, 39, 39, 39, 39), barNotes(37, 37, 40, 37, 37, 37, 40, 37, 39, 39, 42, 39, 39, 39, 42, 39), barNotes(37, 37, 37, 44, 37, 37, 37, 44, 39, 39, 39, 46, 39, 39, 39, 46), barNotes(37, 37, 37, 37, 37, 37, 37, 37, 39, 39, 39, 39, 39, 39, 39, 37)),
    volume: 0.34,
    release: 2.8,
  },
  long_bass: {
    kind: 'bass',
    pattern: pat4([0, 4, 8, 12], [0, 3, 6, 10, 12], [0, 4, 7, 8, 12, 15], [0, 2, 4, 8, 10, 12]),
    notes: notes4(barNotes(36, 36, 43, 36, 36, 36, 41, 36, 36, 36, 43, 36, 36, 38, 36, 36), barNotes(36, 36, 43, 36, 38, 36, 41, 36, 36, 40, 43, 36, 36, 38, 41, 36), barNotes(36, 39, 43, 36, 36, 41, 43, 36, 38, 36, 43, 41, 36, 38, 36, 36), barNotes(36, 36, 43, 36, 36, 36, 41, 36, 36, 36, 43, 36, 36, 38, 36, 34)),
    volume: 0.78,
    release: 1.1,
  },
  long_lead: {
    kind: 'synth',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14, 15]),
    notes: notes4(barNotes(68, 65, 63, 61, 68, 65, 63, 61, 70, 68, 65, 63, 68, 65, 63, 60), barNotes(68, 65, 63, 61, 65, 63, 61, 60, 70, 68, 65, 63, 68, 65, 63, 60), barNotes(70, 68, 65, 63, 68, 65, 63, 61, 72, 70, 68, 65, 68, 65, 63, 60), barNotes(68, 65, 63, 61, 68, 65, 63, 61, 70, 68, 65, 63, 68, 65, 63, 58)),
    volume: 0.32,
    release: 0.55,
  },
  long_wash: {
    kind: 'fx',
    pattern: pat4([0], [0, 8], [0, 6, 12], [0, 4, 8, 12]),
    volume: 0.28,
    release: 3.2,
  },

  // Foundation extras
  sub_sidechain: { kind: 'bass', pattern: pat(0, 4, 8, 12), notes: [36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 41, 36, 36], volume: 0.85, release: 0.5 },
  cow_memphis: { kind: 'cowbell', pattern: pat(0, 3, 6, 8, 11, 14), pitch: 520, volume: 0.62, release: 0.14 },

  // Phonk
  kick_phonk: { kind: 'kick', pattern: pat(0, 4, 8, 12), volume: 0.98, release: 0.72, pitch: 120 },
  hat_phonk: { kind: 'hat', pattern: pat(2, 5, 8, 10, 12, 15), volume: 0.28, release: 0.028 },
  snare_phonk: { kind: 'snare', pattern: pat(4, 12), volume: 0.78, release: 0.22 },
  bass_phonk: { kind: 'bass', pattern: pat(0, 2, 4, 6, 8, 10, 12, 14), notes: [32, 32, 39, 32, 32, 37, 32, 32, 32, 32, 39, 32, 32, 37, 32, 32], volume: 0.9, release: 0.35 },
  synth_memphis: { kind: 'synth', pattern: pat(0, 3, 6, 8, 11, 14), notes: [63, 63, 66, 63, 68, 63, 66, 63, 63, 63, 66, 63, 68, 63, 66, 60], volume: 0.4, release: 0.18 },
  fx_gun: { kind: 'fx', pattern: pat(0, 8), volume: 0.45, release: 0.08, pitch: 200, fxStyle: 'gun' },
  vinyl_crackle: { kind: 'vinyl', pattern: every(2), volume: 0.1, release: 0.04 },

  // EDM
  kick_bigroom: { kind: 'kick', pattern: pat(0, 4, 8, 12), volume: 0.96, release: 0.48, pitch: 175 },
  clap_edm2: { kind: 'clap', pattern: pat(4, 12), volume: 0.62, release: 0.14 },
  hat_edm: { kind: 'hat', pattern: pat(2, 6, 10, 14), volume: 0.3, release: 0.04 },
  snare_bigroom: { kind: 'snare', pattern: pat(4, 12), volume: 0.8, release: 0.22 },
  bass_pluck_edm: { kind: 'bass', pattern: pat(0, 3, 6, 8, 11, 14), notes: [40, 43, 47, 40, 43, 50, 40, 43, 40, 43, 47, 40, 43, 50, 40, 43], volume: 0.68, release: 0.12 },
  synth_supersaw: { kind: 'synth', pattern: pat(0, 4, 8, 12), notes: [60, 60, 63, 60, 67, 60, 63, 60, 60, 60, 63, 60, 67, 60, 63, 58], volume: 0.44, release: 0.18 },
  synth_arp_edm: { kind: 'synth', pattern: pat(0, 2, 4, 6, 8, 10, 12, 14), notes: [72, 76, 79, 84, 79, 76, 72, 67, 72, 76, 79, 84, 79, 76, 72, 67], volume: 0.38, release: 0.1 },
  fx_drop: { kind: 'fx', pattern: pat(0), volume: 0.55, release: 0.5 },
  kick_house: { kind: 'kick', pattern: pat(0, 4, 8, 12), volume: 0.9, release: 0.4, pitch: 195 },
  hat_shuffle_edm: { kind: 'hat', pattern: pat(2, 4, 6, 10, 12, 14), volume: 0.26, release: 0.035 },
  snare_layer: { kind: 'snare', pattern: pat(4, 12), volume: 0.74, release: 0.16 },
  bass_sidechain: { kind: 'bass', pattern: pat(0, 2, 4, 6, 8, 10, 12, 14), notes: [36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 41, 36, 36], volume: 0.8, release: 0.35 },
  synth_lead_edm: { kind: 'synth', pattern: pat(0, 3, 6, 8, 11, 14), notes: [76, 79, 84, 79, 76, 72, 76, 79, 84, 79, 76, 72, 76, 79, 84, 72], volume: 0.4, release: 0.14 },
  fx_uplift: { kind: 'fx', pattern: pat(12, 13, 14, 15), volume: 0.42, release: 0.45 },

  // Extra
  clap_trap: { kind: 'clap', pattern: pat(4, 12), volume: 0.52, release: 0.1 },
  hat_trap16: { kind: 'hat', pattern: every(1), volume: 0.2, release: 0.022 },
  perc_ghost: { kind: 'perc', pattern: pat(3, 7, 11, 15), volume: 0.18, release: 0.04 },
  fx_reverse: { kind: 'fx', pattern: pat(0, 8), volume: 0.38, release: 0.35, fxStyle: 'reverse' },

  // Long loops (extra) — 4小節
  long_wub: {
    kind: 'bass',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 8, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14]),
    notes: notes4(barNotes(36, 36, 39, 36, 43, 36, 39, 36, 36, 36, 39, 36, 43, 36, 39, 36), barNotes(36, 39, 36, 43, 36, 39, 36, 34, 36, 39, 36, 43, 36, 39, 36, 34), barNotes(36, 36, 39, 43, 36, 39, 43, 36, 36, 39, 43, 36, 39, 36, 34, 32), barNotes(36, 36, 39, 36, 43, 36, 39, 36, 36, 36, 39, 36, 43, 36, 39, 36)),
    volume: 0.74,
    release: 0.9,
  },
  long_sidechain: {
    kind: 'bass',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 7, 8, 10, 12, 15], [0, 2, 4, 6, 8, 10, 12, 14]),
    notes: notes4(barNotes(36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 41, 36, 36), barNotes(36, 36, 43, 36, 41, 36, 43, 36, 36, 43, 41, 36, 36, 41, 36, 36), barNotes(36, 43, 41, 36, 36, 43, 41, 36, 36, 43, 36, 41, 36, 43, 36, 36), barNotes(36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 41, 36, 34)),
    volume: 0.72,
    release: 0.85,
  },
  long_phonk_pad: {
    kind: 'synth',
    pattern: pat4([0, 8], [0, 4, 8, 12], [0, 3, 6, 9, 12], [0, 8, 14]),
    notes: notes4(barNotes(44, 44, 44, 44, 44, 44, 44, 44, 47, 47, 47, 47, 47, 47, 47, 47), barNotes(44, 44, 47, 44, 44, 44, 47, 44, 44, 47, 49, 47, 44, 44, 47, 44), barNotes(44, 47, 49, 44, 47, 49, 44, 47, 44, 47, 49, 51, 47, 44, 47, 44), barNotes(44, 44, 44, 44, 44, 44, 44, 44, 47, 47, 47, 47, 47, 47, 47, 42)),
    volume: 0.36,
    release: 3.0,
  },
  long_strings: {
    kind: 'synth',
    pattern: pat4([0, 4, 8, 12], [0, 4, 8, 12], [0, 3, 6, 9, 12], [0, 4, 8, 12, 14]),
    notes: notes4(barNotes(48, 51, 55, 48, 51, 55, 48, 51, 55, 48, 51, 55, 48, 51, 55, 48), barNotes(48, 51, 55, 58, 51, 55, 48, 51, 55, 48, 51, 55, 58, 51, 55, 48), barNotes(48, 51, 55, 48, 53, 55, 58, 55, 53, 51, 48, 51, 55, 48, 51, 48), barNotes(48, 51, 55, 48, 51, 55, 48, 51, 55, 48, 51, 55, 48, 51, 55, 46)),
    volume: 0.3,
    release: 2.5,
  },
  long_arp: {
    kind: 'synth',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 10, 12, 14], [0, 2, 4, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14, 15]),
    notes: notes4(barNotes(72, 76, 79, 84, 79, 76, 72, 67, 72, 76, 79, 84, 79, 76, 72, 67), barNotes(72, 76, 79, 84, 88, 84, 79, 76, 72, 76, 79, 84, 79, 76, 72, 67), barNotes(74, 77, 81, 86, 81, 77, 74, 69, 74, 77, 81, 86, 81, 77, 74, 69), barNotes(72, 76, 79, 84, 79, 76, 72, 67, 72, 76, 79, 84, 88, 84, 79, 67)),
    volume: 0.34,
    release: 0.5,
  },
  long_supersaw: {
    kind: 'synth',
    pattern: pat4([0, 8], [0, 4, 8, 12], [0, 2, 6, 8, 12], [0, 8, 12, 14]),
    notes: notes4(barNotes(60, 60, 60, 60, 60, 60, 60, 60, 63, 63, 63, 63, 63, 63, 63, 63), barNotes(60, 60, 63, 60, 60, 63, 60, 60, 63, 67, 63, 60, 60, 63, 60, 60), barNotes(60, 63, 67, 60, 63, 67, 72, 67, 63, 60, 63, 67, 60, 63, 60, 58), barNotes(60, 60, 60, 60, 60, 60, 60, 60, 63, 63, 63, 63, 63, 63, 63, 58)),
    volume: 0.34,
    release: 2.4,
  },
  long_choir: {
    kind: 'synth',
    pattern: pat4([0, 4, 8, 12], [0, 8], [0, 4, 8, 12], [0, 4, 8, 12, 14]),
    notes: notes4(barNotes(56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 56), barNotes(56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 56), barNotes(56, 59, 63, 65, 63, 59, 56, 59, 63, 56, 59, 63, 65, 63, 59, 56), barNotes(56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 56, 59, 63, 54)),
    volume: 0.28,
    release: 3.2,
  },
  long_cow_loop: {
    kind: 'cowbell',
    pattern: pat4([0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 9, 12, 15], [0, 2, 4, 6, 8, 10, 12, 14]),
    pitch: 520,
    volume: 0.48,
    release: 0.35,
  },
  long_hat_groove: {
    kind: 'hat',
    pattern: pat4(
      [0, 2, 4, 6, 8, 10, 12, 14],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [0, 2, 4, 6, 8, 10, 12, 14],
    ),
    volume: 0.22,
    release: 0.04,
  },
  long_edm_groove: {
    kind: 'clap',
    pattern: pat4([4, 12], [4, 12], [4, 8, 12], [4, 6, 10, 12, 14]),
    volume: 0.55,
    release: 0.14,
  },
  long_edm_build: {
    kind: 'snare',
    pattern: pat4([4, 12], [4, 8, 12], [4, 6, 8, 10, 12, 14], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    volume: 0.58,
    release: 0.14,
  },
  long_trap_808: {
    kind: 'kick',
    pattern: pat4([0, 4, 8, 12], [0, 3, 6, 8, 11, 14], [0, 4, 7, 8, 12], [0, 2, 4, 8, 10, 12]),
    volume: 0.9,
    release: 0.85,
    pitch: 130,
  },
  long_vinyl: {
    kind: 'vinyl',
    pattern: pat4(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    ),
    volume: 0.12,
    release: 0.08,
  },

  // Phonk — 4小節
  long_phonk_kick: {
    kind: 'kick',
    pattern: pat4([0, 4, 8, 12], [0, 3, 6, 8, 11, 14], [0, 4, 7, 8, 12, 15], [0, 2, 4, 8, 10, 12]),
    volume: 0.94,
    release: 0.8,
    pitch: 125,
  },
  long_phonk_drums: {
    kind: 'snare',
    pattern: pat4([4, 12], [4, 6, 10, 12, 14], [4, 7, 12, 15], [4, 6, 8, 10, 12, 14, 15]),
    volume: 0.7,
    release: 0.18,
  },
  long_phonk_bass: {
    kind: 'bass',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 7, 8, 10, 12, 15], [0, 2, 4, 6, 8, 10, 12, 14]),
    notes: notes4(barNotes(32, 32, 39, 32, 32, 37, 32, 32, 32, 32, 39, 32, 32, 37, 32, 32), barNotes(32, 32, 39, 32, 37, 32, 39, 32, 32, 39, 37, 32, 32, 37, 32, 30), barNotes(30, 32, 39, 32, 32, 37, 39, 32, 32, 32, 39, 37, 32, 37, 32, 28), barNotes(32, 32, 39, 32, 32, 37, 32, 32, 32, 32, 39, 32, 32, 37, 32, 28)),
    volume: 0.88,
    release: 0.55,
  },
  long_phonk_memphis: {
    kind: 'synth',
    pattern: pat4([0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 10, 12, 14], [0, 3, 6, 9, 12, 15], [0, 2, 4, 6, 8, 11, 14]),
    notes: notes4(barNotes(63, 63, 66, 63, 68, 63, 66, 63, 63, 63, 66, 63, 68, 63, 66, 60), barNotes(63, 66, 68, 63, 66, 68, 70, 68, 63, 66, 68, 63, 66, 63, 60, 58), barNotes(60, 63, 66, 68, 66, 63, 60, 63, 66, 68, 70, 68, 66, 63, 60, 58), barNotes(63, 63, 66, 63, 68, 63, 66, 63, 63, 66, 68, 63, 66, 63, 60, 55)),
    volume: 0.38,
    release: 0.45,
  },
  long_phonk_hats: {
    kind: 'hat',
    pattern: pat4([2, 5, 8, 10, 12, 15], [2, 4, 6, 8, 10, 12, 14], [2, 5, 8, 10, 12, 14, 15], [2, 4, 6, 8, 10, 12, 14, 15]),
    volume: 0.26,
    release: 0.03,
  },

  // EDM — 4小節
  long_edm_bigroom: {
    kind: 'kick',
    pattern: pat4([0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12]),
    volume: 0.96,
    release: 0.5,
    pitch: 175,
  },
  long_edm_house: {
    kind: 'kick',
    pattern: pat4([0, 4, 8, 12], [0, 6, 8, 14], [0, 4, 7, 8, 12], [0, 4, 8, 10, 12]),
    volume: 0.9,
    release: 0.42,
    pitch: 195,
  },
  long_edm_pluck: {
    kind: 'bass',
    pattern: pat4([0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 10, 12, 14], [0, 3, 6, 9, 12, 15], [0, 2, 4, 6, 8, 11, 14]),
    notes: notes4(barNotes(40, 43, 47, 40, 43, 50, 40, 43, 40, 43, 47, 40, 43, 50, 40, 43), barNotes(40, 43, 47, 50, 47, 43, 40, 43, 40, 43, 47, 50, 47, 43, 40, 38), barNotes(38, 40, 43, 47, 50, 47, 43, 40, 38, 40, 43, 47, 43, 40, 38, 36), barNotes(40, 43, 47, 40, 43, 50, 47, 43, 40, 43, 47, 40, 43, 50, 40, 38)),
    volume: 0.65,
    release: 0.2,
  },
  long_edm_chord: {
    kind: 'synth',
    pattern: pat4([0, 8], [0, 4, 8, 12], [0, 4, 8, 12], [0, 8, 14]),
    notes: notes4(barNotes(60, 60, 60, 60, 60, 60, 60, 60, 63, 63, 63, 63, 63, 63, 63, 63), barNotes(60, 60, 63, 60, 67, 60, 63, 60, 60, 63, 67, 63, 60, 63, 60, 58), barNotes(58, 60, 63, 67, 63, 60, 58, 60, 63, 67, 70, 67, 63, 60, 58, 55), barNotes(60, 60, 60, 60, 60, 60, 60, 60, 63, 63, 63, 63, 63, 63, 63, 58)),
    volume: 0.42,
    release: 1.8,
  },
  long_edm_lead: {
    kind: 'synth',
    pattern: pat4([0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 10, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14, 15]),
    notes: notes4(barNotes(76, 79, 84, 79, 76, 72, 76, 79, 84, 79, 76, 72, 76, 79, 84, 72), barNotes(76, 79, 84, 88, 84, 79, 76, 72, 76, 79, 84, 88, 84, 79, 76, 72), barNotes(79, 84, 88, 91, 88, 84, 79, 76, 79, 84, 88, 91, 88, 84, 79, 76), barNotes(76, 79, 84, 88, 84, 79, 76, 72, 76, 79, 84, 88, 91, 88, 84, 72)),
    volume: 0.36,
    release: 0.35,
  },
  long_edm_hats: {
    kind: 'hat',
    pattern: pat4([2, 6, 10, 14], [2, 4, 6, 10, 12, 14], [2, 6, 10, 14], [0, 2, 4, 6, 8, 10, 12, 14]),
    volume: 0.28,
    release: 0.035,
  },

  // 固定リズム — 4小節とも同じパターン
  long_steady_phonk_kick: {
    kind: 'kick',
    pattern: pat4steady(0, 4, 8, 12),
    volume: 0.94,
    release: 0.75,
    pitch: 125,
  },
  long_steady_phonk_snare: {
    kind: 'snare',
    pattern: pat4steady(4, 12),
    volume: 0.72,
    release: 0.2,
  },
  long_steady_phonk_hat: {
    kind: 'hat',
    pattern: pat4steady(2, 5, 8, 10, 12, 15),
    volume: 0.26,
    release: 0.03,
  },
  long_steady_phonk_bass: {
    kind: 'bass',
    pattern: pat4steady(0, 2, 4, 6, 8, 10, 12, 14),
    notes: notes4steady(barNotes(32, 32, 39, 32, 32, 37, 32, 32, 32, 32, 39, 32, 32, 37, 32, 32)),
    volume: 0.86,
    release: 0.5,
  },
  long_steady_cow: {
    kind: 'cowbell',
    pattern: pat4steady(0, 3, 6, 8, 11, 14),
    pitch: 520,
    volume: 0.5,
    release: 0.32,
  },
  long_steady_edm_kick: {
    kind: 'kick',
    pattern: pat4steady(0, 4, 8, 12),
    volume: 0.96,
    release: 0.48,
    pitch: 175,
  },
  long_steady_edm_clap: {
    kind: 'clap',
    pattern: pat4steady(4, 12),
    volume: 0.58,
    release: 0.14,
  },
  long_steady_edm_hat: {
    kind: 'hat',
    pattern: pat4steady(2, 6, 10, 14),
    volume: 0.3,
    release: 0.035,
  },
  long_steady_edm_bass: {
    kind: 'bass',
    pattern: pat4steady(0, 4, 8, 12),
    notes: notes4steady(barNotes(36, 36, 43, 36, 36, 41, 36, 36, 36, 36, 43, 36, 36, 41, 36, 36)),
    volume: 0.76,
    release: 0.65,
  },
  long_steady_edm_saw: {
    kind: 'synth',
    pattern: pat4steady(0, 8),
    notes: notes4steady(barNotes(60, 60, 60, 60, 60, 60, 60, 60, 63, 63, 63, 63, 63, 63, 63, 63)),
    volume: 0.4,
    release: 2.0,
  },
  long_steady_edm_pluck: {
    kind: 'bass',
    pattern: pat4steady(0, 3, 6, 8, 11, 14),
    notes: notes4steady(barNotes(40, 43, 47, 40, 43, 50, 40, 43, 40, 43, 47, 40, 43, 50, 40, 43)),
    volume: 0.64,
    release: 0.18,
  },
  long_steady_edm_16hat: {
    kind: 'hat',
    pattern: pat4steady(0, 2, 4, 6, 8, 10, 12, 14),
    volume: 0.22,
    release: 0.028,
  },
  long_steady_pad: {
    kind: 'synth',
    pattern: pat4steady(0),
    notes: notes4steady(barNotes(37, 37, 37, 37, 37, 37, 37, 37, 39, 39, 39, 39, 39, 39, 39, 39)),
    volume: 0.32,
    release: 3.0,
  },
  long_steady_wash: {
    kind: 'fx',
    pattern: pat4steady(0),
    volume: 0.26,
    release: 3.4,
  },

  // Vocal — short（人間 / ロボ）
  vocal_human_hey: { kind: 'vocal', pattern: pat(0, 8), notes: barNotes(64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64), volume: 0.62, release: 0.28, vocalStyle: 'human', pitch: 64 },
  vocal_human_yeah: { kind: 'vocal', pattern: pat(0, 4, 8, 12), notes: barNotes(62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62), volume: 0.58, release: 0.32, vocalStyle: 'human', pitch: 62 },
  vocal_human_oi: { kind: 'vocal', pattern: pat(0, 6, 10), notes: barNotes(67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67), volume: 0.65, release: 0.22, vocalStyle: 'human', pitch: 67 },
  vocal_robot_beep: { kind: 'vocal', pattern: pat(0, 8), notes: barNotes(72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72), volume: 0.52, release: 0.18, vocalStyle: 'robot', pitch: 72 },
  vocal_robot_talk: { kind: 'vocal', pattern: pat(0, 3, 6, 9, 12, 15), notes: barNotes(60, 63, 60, 58, 60, 63, 65, 63, 60, 58, 55, 58, 60, 63, 60, 58), volume: 0.5, release: 0.14, vocalStyle: 'robot', pitch: 60 },
  vocal_robot_alert: { kind: 'vocal', pattern: pat(0, 4, 8), notes: barNotes(68, 65, 68, 65, 68, 65, 68, 65, 68, 65, 68, 65, 68, 65, 68, 65), volume: 0.55, release: 0.12, vocalStyle: 'robot', pitch: 68 },

  // Vocal — 4小節（実音声・英語歌詞）
  long_vocal_drift: { kind: 'sample', sampleId: 'drift', pattern: patLoopStart(), volume: 0.88, release: 1 },
  long_vocal_smoke: { kind: 'sample', sampleId: 'smoke', pattern: patLoopStart(), volume: 0.86, release: 1 },
  long_vocal_yeah: { kind: 'sample', sampleId: 'yeah', pattern: patLoopStart(), volume: 0.9, release: 1 },
  long_vocal_dark: { kind: 'sample', sampleId: 'dark', pattern: patLoopStart(), volume: 0.87, release: 1 },
  long_vocal_ride: { kind: 'sample', sampleId: 'ride', pattern: patLoopStart(), volume: 0.89, release: 1 },
};

function triggerKick(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const startFreq = preset.pitch ?? 165;
  noiseBurst(ctx, t, 0.012, preset.volume * 0.35, 1200);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.12);
  g.gain.setValueAtTime(preset.volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  osc.connect(g);
  connectToOut(ctx, g);
  osc.start(t);
  osc.stop(t + rel + 0.05);
}

function triggerHat(ctx: AudioContext, preset: PresetConfig, t: number) {
  const open = preset.release > 0.08;
  const len = Math.floor(ctx.sampleRate * preset.release);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = open ? 5200 : 9800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(preset.volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + preset.release);
  src.connect(f);
  f.connect(g);
  connectToOut(ctx, g);
  src.start(t);
}

function triggerSnare(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const amen = preset.pattern.filter(Boolean).length > 2 && rel < 0.15;
  if (amen) {
    for (const off of [0, 0.025, 0.055]) {
      noiseBurst(ctx, t + off, rel * 0.8, preset.volume * 0.45, 700 + off * 2000);
    }
  } else {
    noiseBurst(ctx, t, rel, preset.volume * 0.75, 800);
  }

  const body = ctx.createOscillator();
  const bodyG = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(amen ? 280 : 220, t);
  body.frequency.exponentialRampToValueAtTime(140, t + 0.04);
  bodyG.gain.setValueAtTime(preset.volume * 0.55, t);
  bodyG.gain.exponentialRampToValueAtTime(0.001, t + rel * 0.6);
  body.connect(bodyG);
  connectToOut(ctx, bodyG);
  body.start(t);
  body.stop(t + rel);
}

function triggerClap(ctx: AudioContext, preset: PresetConfig, t: number) {
  for (let i = 0; i < 4; i++) {
    noiseBurst(ctx, t + i * 0.01, 0.025, preset.volume * 0.28, 600);
  }
}

function triggerCowbell(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const base = preset.pitch ?? 880;
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(preset.volume, t);
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  for (const ratio of [1, 1.498, 2.01]) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = base * ratio;
    const g = ctx.createGain();
    g.gain.value = 0.22 / ratio;
    osc.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + rel + 0.02);
  }

  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = base * 1.2;
  f.Q.value = 1.4;
  mix.connect(f);
  connectToOut(ctx, f);
}

function triggerBass(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = preset.release;
  const midi = preset.notes?.[step] ?? 36;
  const freq = midiToHz(midi);
  const snappy = rel < 0.2;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = snappy ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(freq * (snappy ? 3 : 2.2), t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + (snappy ? 0.04 : 0.07));
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(preset.volume, t + 0.008);
  g.gain.setValueAtTime(preset.volume * (snappy ? 0.7 : 0.85), t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  osc.connect(g);
  connectToOut(ctx, g);
  osc.start(t);
  osc.stop(t + rel + 0.05);

  if (!snappy) {
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = freq * 0.5;
    subG.gain.setValueAtTime(preset.volume * 0.35, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + rel * 0.9);
    sub.connect(subG);
    connectToOut(ctx, subG);
    sub.start(t);
    sub.stop(t + rel + 0.05);
  }
}

function triggerSynth(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = preset.release;
  const midi = preset.notes?.[step] ?? 44;
  const root = midiToHz(midi);
  const dark = rel > 0.5;
  const bright = rel < 0.12;
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0, t);
  mix.gain.linearRampToValueAtTime(preset.volume * 0.45, t + (bright ? 0.005 : 0.02));
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  const ratios = bright ? [1, 2, 3] : dark ? [1, 1.19, 1.5] : [1, 1.25, 1.5, 2];
  const wave = bright ? 'square' : 'sawtooth';
  for (const r of ratios) {
    const osc = ctx.createOscillator();
    osc.type = wave as OscillatorType;
    osc.frequency.value = root * r;
    osc.detune.value = (Math.random() - 0.5) * (bright ? 8 : 18);
    const g = ctx.createGain();
    g.gain.value = 0.28 / ratios.length;
    osc.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + rel + 0.05);
  }

  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  if (bright) {
    f.frequency.setValueAtTime(2800, t);
    f.frequency.exponentialRampToValueAtTime(900, t + rel * 0.7);
  } else {
    f.frequency.value = dark ? 900 : 1800;
  }
  f.Q.value = bright ? 2.2 : 0.8;
  mix.connect(f);
  connectToOut(ctx, f);
}

const HUMAN_FORMANTS: [number, number, number] = [900, 1400, 2800];

function triggerHumanVoice(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = preset.release;
  const noteLen = preset.notes?.length ?? STEPS_PER_BAR;
  const midi = preset.notes?.[step % noteLen] ?? preset.pitch ?? 64;
  const f0 = midiToHz(midi);
  const pitchScale = Math.pow(f0 / midiToHz(64), 0.4);

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0, t);
  mix.gain.linearRampToValueAtTime(preset.volume * 0.7, t + 0.012);
  mix.gain.setValueAtTime(preset.volume * 0.65, t + 0.05);
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  const exciter = ctx.createGain();
  exciter.gain.value = 1;

  for (let h = 1; h <= 8; h++) {
    const osc = ctx.createOscillator();
    osc.type = h <= 2 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(f0 * h * 1.35, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * h, t + 0.05);
    const g = ctx.createGain();
    g.gain.value = (h <= 2 ? 0.28 : 0.12) / h;
    osc.connect(g);
    g.connect(exciter);
    osc.start(t);
    osc.stop(t + rel + 0.05);
  }

  const vib = ctx.createOscillator();
  vib.type = 'sine';
  vib.frequency.value = 5.5;
  const vibAmt = ctx.createGain();
  vibAmt.gain.value = f0 * 0.04;
  vib.connect(vibAmt);
  vibAmt.connect(exciter.gain);
  vib.start(t);
  vib.stop(t + rel + 0.05);

  const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * Math.min(rel, 0.2)));
  const nbuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const nd = nbuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
  const noise = ctx.createBufferSource();
  noise.buffer = nbuf;
  const nhp = ctx.createBiquadFilter();
  nhp.type = 'highpass';
  nhp.frequency.value = 2000;
  const ng = ctx.createGain();
  ng.gain.value = preset.volume * 0.22;
  noise.connect(nhp);
  nhp.connect(ng);
  ng.connect(mix);
  noise.start(t);

  const formMix = ctx.createGain();
  formMix.gain.value = 1;
  const weights = [0.55, 0.35, 0.22];
  for (let fi = 0; fi < 3; fi++) {
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = HUMAN_FORMANTS[fi] * pitchScale;
    bpf.Q.value = fi === 0 ? 2.5 : 4.5;
    const fg = ctx.createGain();
    fg.gain.value = weights[fi];
    exciter.connect(bpf);
    bpf.connect(fg);
    fg.connect(formMix);
  }

  const clip = ctx.createWaveShaper();
  clip.curve = makeDistortionCurve(32);
  clip.oversample = '4x';
  formMix.connect(clip);
  clip.connect(mix);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5200;
  mix.connect(lp);
  connectToOut(ctx, lp);
}

function triggerRobotVoice(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = preset.release;
  const noteLen = preset.notes?.length ?? STEPS_PER_BAR;
  const midi = preset.notes?.[step % noteLen] ?? preset.pitch ?? 60;
  const f0 = midiToHz(midi);

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0, t);
  mix.gain.linearRampToValueAtTime(preset.volume, t + 0.004);
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  const carrier = ctx.createOscillator();
  carrier.type = 'square';
  carrier.frequency.value = f0;

  const mod = ctx.createOscillator();
  mod.type = 'square';
  mod.frequency.value = 48 + (step % 3) * 17;

  const ring = ctx.createGain();
  ring.gain.value = 0;
  mod.connect(ring.gain);
  carrier.connect(ring);

  const metallic = ctx.createBiquadFilter();
  metallic.type = 'bandpass';
  metallic.frequency.value = Math.min(4000, f0 * 3.5);
  metallic.Q.value = 12;

  const bitcrush = ctx.createWaveShaper();
  const steps = 8;
  const crushCurve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    crushCurve[i] = Math.round(x * steps) / steps;
  }
  bitcrush.curve = crushCurve;
  bitcrush.oversample = 'none';

  const clip = ctx.createWaveShaper();
  clip.curve = makeDistortionCurve(48);
  clip.oversample = '2x';

  ring.connect(metallic);
  metallic.connect(bitcrush);
  bitcrush.connect(clip);
  clip.connect(mix);

  const robo2 = ctx.createOscillator();
  robo2.type = 'square';
  robo2.frequency.value = f0 * 0.5;
  const robo2g = ctx.createGain();
  robo2g.gain.setValueAtTime(preset.volume * 0.35, t);
  robo2g.gain.exponentialRampToValueAtTime(0.001, t + rel * 0.8);
  robo2.connect(robo2g);
  robo2g.connect(mix);

  carrier.start(t);
  carrier.stop(t + rel + 0.05);
  mod.start(t);
  mod.stop(t + rel + 0.05);
  robo2.start(t);
  robo2.stop(t + rel + 0.05);

  connectToOut(ctx, mix);
}

function triggerPhonkVocal(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = Math.min(preset.release, 0.36);
  const noteLen = preset.notes?.length ?? STEPS_PER_BAR;
  const midi = preset.notes?.[step % noteLen] ?? preset.pitch ?? 52;
  const f0 = midiToHz(midi) * 0.88;
  const pitchScale = Math.pow(f0 / midiToHz(50), 0.35);

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0, t);
  mix.gain.linearRampToValueAtTime(preset.volume * 0.82, t + 0.006);
  mix.gain.setValueAtTime(preset.volume * 0.75, t + 0.04);
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  const exciter = ctx.createGain();
  exciter.gain.value = 1;

  for (let h = 1; h <= 6; h++) {
    const osc = ctx.createOscillator();
    osc.type = h === 1 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(f0 * h * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * h * 0.95, t + 0.04);
    const g = ctx.createGain();
    g.gain.value = (h === 1 ? 0.32 : 0.14) / h;
    osc.connect(g);
    g.connect(exciter);
    osc.start(t);
    osc.stop(t + rel + 0.05);
  }

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = f0 * 0.5;
  const subG = ctx.createGain();
  subG.gain.setValueAtTime(preset.volume * 0.28, t);
  subG.gain.exponentialRampToValueAtTime(0.001, t + rel * 0.9);
  sub.connect(subG);
  subG.connect(mix);
  sub.start(t);
  sub.stop(t + rel + 0.05);

  noiseBurst(ctx, t, Math.min(rel, 0.06), preset.volume * 0.18, 2800);
  noiseBurst(ctx, t + 0.01, Math.min(rel * 0.5, 0.04), preset.volume * 0.1, 6000);

  const phonkFormants: [number, number, number] = [620, 980, 2100];
  const formMix = ctx.createGain();
  formMix.gain.value = 1;
  for (let fi = 0; fi < 3; fi++) {
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = phonkFormants[fi] * pitchScale;
    bpf.Q.value = fi === 0 ? 3 : 5;
    const fg = ctx.createGain();
    fg.gain.value = [0.58, 0.38, 0.2][fi];
    exciter.connect(bpf);
    bpf.connect(fg);
    fg.connect(formMix);
  }

  const clip = ctx.createWaveShaper();
  clip.curve = makeDistortionCurve(52);
  clip.oversample = '4x';
  formMix.connect(clip);
  clip.connect(mix);

  const loFi = ctx.createBiquadFilter();
  loFi.type = 'bandpass';
  loFi.frequency.value = 1400 * pitchScale;
  loFi.Q.value = 0.65;
  mix.connect(loFi);
  connectToOut(ctx, loFi);
}

function triggerVocal(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  if (preset.vocalStyle === 'robot') {
    triggerRobotVoice(ctx, preset, t, step);
  } else if (preset.vocalStyle === 'phonk') {
    triggerPhonkVocal(ctx, preset, t, step);
  } else {
    triggerHumanVoice(ctx, preset, t, step);
  }
}

function triggerReese(ctx: AudioContext, preset: PresetConfig, t: number, step: number) {
  const rel = preset.release;
  const midi = preset.notes?.[step] ?? 28;
  const freq = midiToHz(midi);
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0, t);
  mix.gain.linearRampToValueAtTime(preset.volume * 0.42, t + 0.025);
  mix.gain.exponentialRampToValueAtTime(0.001, t + rel);

  for (const det of [-24, -8, 8, 24]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = det;
    const g = ctx.createGain();
    g.gain.value = 0.11;
    osc.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + rel + 0.05);
  }

  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(160, t);
  f.frequency.exponentialRampToValueAtTime(rel > 0.6 ? 900 : 1400, t + rel * 0.45);
  f.Q.value = rel > 0.6 ? 4 : 10;
  mix.connect(f);
  connectToOut(ctx, f);
}

function triggerGunFx(ctx: AudioContext, preset: PresetConfig, t: number) {
  noiseBurst(ctx, t, 0.006, preset.volume * 0.5, 2000);
  noiseBurst(ctx, t + 0.02, 0.04, preset.volume * 0.35, 400);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(preset.pitch ?? 200, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.06);
  g.gain.setValueAtTime(preset.volume * 0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(g);
  connectToOut(ctx, g);
  osc.start(t);
  osc.stop(t + 0.1);
}

function triggerSiren(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const base = preset.pitch ?? 440;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base * 0.6, t);
  osc.frequency.exponentialRampToValueAtTime(base * 2.2, t + rel * 0.85);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(preset.volume, t + rel * 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  osc.connect(g);
  connectToOut(ctx, g);
  osc.start(t);
  osc.stop(t + rel + 0.05);
}

function triggerReverseFx(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const len = Math.floor(ctx.sampleRate * rel);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = i / len;
    d[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(preset.volume * 0.2, t);
  g.gain.linearRampToValueAtTime(preset.volume, t + rel * 0.85);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  src.connect(f);
  f.connect(g);
  connectToOut(ctx, g);
  src.start(t);
}

function triggerFx(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const len = Math.floor(ctx.sampleRate * rel);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = 1 - i / len;
    d[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(8000, t + rel * 0.85);
  f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(preset.volume * 0.4, t);
  g.gain.linearRampToValueAtTime(preset.volume, t + rel * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  src.connect(f);
  f.connect(g);
  connectToOut(ctx, g);
  src.start(t);
}

function triggerPerc(ctx: AudioContext, preset: PresetConfig, t: number) {
  const rel = preset.release;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + rel * 0.5);
  g.gain.setValueAtTime(preset.volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + rel);
  osc.connect(g);
  connectToOut(ctx, g);
  osc.start(t);
  osc.stop(t + rel + 0.05);
  noiseBurst(ctx, t, rel * 0.3, preset.volume * 0.2, 400);
}

function triggerVinyl(ctx: AudioContext, preset: PresetConfig, t: number) {
  noiseBurst(ctx, t, preset.release, preset.volume, 2000);
  noiseBurst(ctx, t + preset.release * 0.3, preset.release * 0.5, preset.volume * 0.6, 3500);
}

const activeSampleSources: AudioBufferSourceNode[] = [];

function stopAllSamples(): void {
  for (const src of activeSampleSources) {
    try { src.stop(); } catch { /* already stopped */ }
  }
  activeSampleSources.length = 0;
}

function registerSampleSource(src: AudioBufferSourceNode): void {
  activeSampleSources.push(src);
  src.onended = () => {
    const i = activeSampleSources.indexOf(src);
    if (i >= 0) activeSampleSources.splice(i, 1);
  };
}

function triggerSample(
  ctx: AudioContext,
  preset: PresetConfig,
  t: number,
  playbackRate: number,
  sectionBpm = DEFAULT_BPM,
): AudioBufferSourceNode | null {
  if (!preset.sampleId) return null;
  const buffer = getSampleBuffer(preset.sampleId);
  if (!buffer) return null;

  const loopDuration = LONG_LOOP_BARS * BEATS_PER_BAR * 60 / sectionBpm;
  const phonkPitch = 0.9;
  const rate = Math.min(4, Math.max(0.25, (buffer.duration / loopDuration) * phonkPitch * playbackRate));
  const playDuration = buffer.duration / rate;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3400;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(preset.volume, t + 0.03);
  g.gain.setValueAtTime(preset.volume, t + Math.max(0.05, playDuration - 0.08));
  g.gain.linearRampToValueAtTime(0.001, t + playDuration);

  src.connect(lp);
  lp.connect(g);
  connectToOut(ctx, g);
  src.start(t);
  registerSampleSource(src);
  return src;
}

function triggerStep(ctx: AudioContext, preset: PresetConfig, time: number, step: number, playbackRate = 1, sectionBpm = DEFAULT_BPM) {
  const t = time;
  const scaled: PresetConfig = playbackRate === 1
    ? preset
    : {
        ...preset,
        release: preset.release / playbackRate,
        pitch: preset.pitch ? preset.pitch * playbackRate : undefined,
      };

  switch (scaled.kind) {
    case 'kick': triggerKick(ctx, scaled, t); break;
    case 'hat': triggerHat(ctx, scaled, t); break;
    case 'snare': triggerSnare(ctx, scaled, t); break;
    case 'clap': triggerClap(ctx, scaled, t); break;
    case 'cowbell': triggerCowbell(ctx, scaled, t); break;
    case 'bass': triggerBass(ctx, scaled, t, step); break;
    case 'synth': triggerSynth(ctx, scaled, t, step); break;
    case 'fx':
      if (scaled.fxStyle === 'gun') triggerGunFx(ctx, scaled, t);
      else if (scaled.fxStyle === 'siren') triggerSiren(ctx, scaled, t);
      else if (scaled.fxStyle === 'reverse') triggerReverseFx(ctx, scaled, t);
      else triggerFx(ctx, scaled, t);
      break;
    case 'perc': triggerPerc(ctx, scaled, t); break;
    case 'vinyl': triggerVinyl(ctx, scaled, t); break;
    case 'reese': triggerReese(ctx, scaled, t, step); break;
    case 'vocal': triggerVocal(ctx, scaled, t, step); break;
    case 'sample': triggerSample(ctx, scaled, t, playbackRate, sectionBpm); break;
  }
}

function triggerShot(ctx: AudioContext, preset: PresetConfig) {
  triggerStep(ctx, preset, ctx.currentTime, 0);
}

function getPresetForPad(padId: string): PresetConfig | null {
  const pad = getPadById(padId);
  if (!pad) return null;
  return PRESETS[pad.preset] ?? null;
}

function getNoteStep(preset: PresetConfig, step: number): number {
  const len = preset.notes?.length ?? STEPS_PER_BAR;
  return step % len;
}

export function getDefaultPattern(padId: string): StepPattern {
  const pad = getPadById(padId);
  if (!pad) return pat(0);
  const preset = PRESETS[pad.preset];
  if (!preset) return pat(0);
  if (pad.isLong && preset.pattern.length >= LONG_LOOP_STEPS) {
    return [...preset.pattern] as StepPattern;
  }
  return [...preset.pattern] as StepPattern;
}

export function getPresetPattern(padId: string): StepPattern | null {
  return getDefaultPattern(padId);
}

export function resolveLayerPattern(padId: string, custom?: StepPattern, sectionBpm?: number): StepPattern {
  const base = custom?.length ? custom : getDefaultPattern(padId);
  if (sectionBpm == null) return base;
  return resizeStepPattern(base, getSectionTotalSteps(sectionBpm));
}

interface ActiveTrack {
  preset: PresetConfig;
  pattern: StepPattern;
  sectionIndex: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private tracks: ActiveTrack[] = [];
  private playing = false;
  private sectionCount = 1;
  private baseBpm = 140;
  private sectionBpms: number[] = [140];
  private currentSection = 0;
  private currentStep = 0;
  private stepListeners: StepListener[] = [];
  private tickFn: (() => void) | null = null;
  private previewMode = false;
  private previewMaxSteps = 0;
  private previewStepMs = 0;

  private previewStopTimer: ReturnType<typeof setTimeout> | null = null;

  onStep(fn: StepListener): () => void {
    this.stepListeners.push(fn);
    return () => { this.stepListeners = this.stepListeners.filter((f) => f !== fn); };
  }

  private notifyStep(pos: PlaybackPosition) {
    this.stepListeners.forEach((fn) => fn(pos));
  }

  get isPlaying() { return this.playing; }

  async ensureContext(): Promise<AudioContext> {
    return this.ensureCtx();
  }

  private async ensureCtx(): Promise<AudioContext> {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  async playPadOnce(padId: string): Promise<void> {
    const pad = getPadById(padId);
    if (!pad) return;
    const preset = getPresetForPad(padId);
    if (!preset) return;
    if (pad.isLong) {
      await this.playLongPreview(padId);
      return;
    }
    const ctx = await this.ensureCtx();
    triggerShot(ctx, preset);
  }

  /** ロングパッド: 4小節まるごと試聴 */
  async playLongPreview(padId: string, bpm = DEFAULT_BPM): Promise<void> {
    const preset = getPresetForPad(padId);
    if (!preset) return;

    if (preset.kind === 'sample') {
      const ctx = await this.ensureCtx();
      await ensureVocalSamplesLoaded(ctx);
      this.stop();
      this.playing = true;
      this.previewMode = true;
      const durationSec = LONG_LOOP_BARS * BEATS_PER_BAR * 60 / bpm;
      triggerSample(ctx, preset, ctx.currentTime + 0.02, getAbsoluteSpeedRatio(bpm), bpm);
      this.previewStopTimer = setTimeout(() => this.stop(), durationSec * 1000);
      return;
    }

    const pattern = getDefaultPattern(padId);
    this.stop();
    await this.ensureCtx();
    this.tracks = [{ preset, pattern, sectionIndex: 0 }];
    this.previewMode = true;
    this.previewMaxSteps = pattern.length;
    this.previewStepMs = (LONG_LOOP_BARS * BEATS_PER_BAR * 60000 / bpm) / pattern.length;
    this.sectionCount = 1;
    this.baseBpm = bpm;
    this.sectionBpms = [bpm];
    this.currentSection = 0;
    this.currentStep = 0;
    this.playing = true;

    this.tickFn = () => {
      if (!this.ctx) return;
      if (this.currentStep >= this.previewMaxSteps) {
        this.stop();
        return;
      }
      const now = this.ctx.currentTime;
      const playbackRate = getAbsoluteSpeedRatio(bpm);
      for (const track of this.tracks) {
        if (track.pattern[this.currentStep]) {
          const noteStep = getNoteStep(track.preset, this.currentStep);
          triggerStep(this.ctx, track.preset, now + 0.02, noteStep, playbackRate, bpm);
        }
      }
      this.notifyStep({ section: 0, step: this.currentStep });
      this.currentStep += 1;
    };

    this.tickFn();
    this.scheduleTick();
  }

  private buildTracks(tracks: PlayTrack[]): ActiveTrack[] {
    return tracks.map(({ padId, pattern, sectionIndex }) => {
      const preset = getPresetForPad(padId);
      if (!preset) return null;
      return { preset, pattern, sectionIndex };
    }).filter((t): t is ActiveTrack => t !== null);
  }

  private getStepMs(section: number): number {
    if (this.previewMode) return this.previewStepMs;
    const sectionBpm = this.sectionBpms[section] ?? this.baseBpm;
    return getSectionStepMs(this.baseBpm, sectionBpm);
  }

  private scheduleTick(): void {
    if (!this.playing || !this.tickFn) return;
    this.tickTimer = setTimeout(() => {
      this.tickFn?.();
      this.scheduleTick();
    }, this.getStepMs(this.currentSection));
  }

  async play(tracks: PlayTrack[], baseBpm: number, sectionCount = 1, sectionBpms?: number[]): Promise<void> {
    if (tracks.length === 0) return;
    this.stop();
    await this.ensureCtx();
    const built = this.buildTracks(tracks);
    if (built.length === 0) return;
    if (built.some((t) => t.preset.kind === 'sample')) {
      await ensureVocalSamplesLoaded(this.ctx!);
    }
    this.tracks = built;
    this.sectionCount = Math.max(1, sectionCount);
    this.baseBpm = baseBpm;
    this.sectionBpms = sectionBpms?.length
      ? sectionBpms
      : Array(this.sectionCount).fill(baseBpm);
    this.currentSection = 0;
    this.currentStep = 0;

    this.tickFn = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const sectionBpm = this.sectionBpms[this.currentSection] ?? this.baseBpm;
      const totalSteps = getSectionTotalSteps(sectionBpm);
      const playbackRate = getAbsoluteSpeedRatio(sectionBpm);
      for (const track of this.tracks) {
        if (track.sectionIndex === this.currentSection && track.pattern[this.currentStep]) {
          const noteStep = getNoteStep(track.preset, this.currentStep);
          triggerStep(this.ctx, track.preset, now + 0.02, noteStep, playbackRate, sectionBpm);
        }
      }
      this.notifyStep({ section: this.currentSection, step: this.currentStep });
      this.currentStep += 1;
      if (this.currentStep >= totalSteps) {
        this.currentStep = 0;
        this.currentSection = (this.currentSection + 1) % this.sectionCount;
      }
    };

    this.playing = true;
    this.tickFn();
    this.scheduleTick();
  }

  stop(): void {
    if (this.tickTimer) { clearTimeout(this.tickTimer); this.tickTimer = null; }
    if (this.previewStopTimer) { clearTimeout(this.previewStopTimer); this.previewStopTimer = null; }
    stopAllSamples();
    this.tickFn = null;
    this.previewMode = false;
    this.previewMaxSteps = 0;
    this.previewStepMs = 0;
    this.tracks = [];
    this.currentSection = 0;
    this.currentStep = 0;
    this.sectionCount = 1;
    this.baseBpm = 140;
    this.sectionBpms = [140];
    this.playing = false;
    this.notifyStep({ section: -1, step: -1 });
  }

  async toggle(tracks: PlayTrack[], bpm: number, sectionCount?: number, sectionBpms?: number[]): Promise<void> {
    if (this.playing) this.stop();
    else await this.play(tracks, bpm, sectionCount, sectionBpms);
  }

  async previewLoop(padId: string, bpm: number): Promise<void> {
    const pad = getPadById(padId);
    if (pad?.isLong) {
      await this.playLongPreview(padId, bpm);
      return;
    }
    await this.play([{ padId, pattern: getDefaultPattern(padId), sectionIndex: 0 }], bpm, 1);
  }
}

export const audioEngine = new AudioEngine();

export function buildPlayTracks(
  layers: { loopId: string; pattern?: StepPattern; sectionIndex?: number }[],
  sectionBpms?: number[],
  fallbackBpm = 140,
): PlayTrack[] {
  return layers.map((l) => {
    const si = l.sectionIndex ?? 0;
    const bpm = sectionBpms?.[si] ?? fallbackBpm;
    return {
      padId: l.loopId,
      pattern: resolveLayerPattern(l.loopId, l.pattern, bpm),
      sectionIndex: si,
    };
  });
}
