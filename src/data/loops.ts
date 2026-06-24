import type { PadDefinition } from '@/types';

/** Phonk / EDM Drum Pad Pack */
export const PAD_PACK: PadDefinition[] = [
  // ── Foundation（808 / cowbell / sub）──
  { id: 'pad-kick-4', name: '808 Kick', nameJa: '808キック', category: 'kick', preset: 'kick_4x4', color: '#ff2244', colorDark: '#aa0022', shortLabel: '808', gridIndex: 0, isFoundation: true },
  { id: 'pad-kick-punch', name: '808 Sync', nameJa: 'シンコK', category: 'kick', preset: 'kick_punch', color: '#ff4455', colorDark: '#cc1122', shortLabel: 'SYNC', gridIndex: 1, isFoundation: true },
  { id: 'pad-sub', name: '808 Sub', nameJa: '808ベース', category: 'bass', preset: 'sub_edm', color: '#7722ff', colorDark: '#4400aa', shortLabel: 'SUB', gridIndex: 2, isFoundation: true },
  { id: 'pad-clap', name: 'Cowbell', nameJa: 'カウベル', category: 'cowbell', preset: 'clap_edm', color: '#ffcc00', colorDark: '#aa8800', shortLabel: 'COW', gridIndex: 3, isFoundation: true },
  { id: 'pad-side-sub', name: 'Side Sub', nameJa: 'サイドSub', category: 'bass', preset: 'sub_sidechain', color: '#2266ff', colorDark: '#1144cc', shortLabel: 'SSUB', gridIndex: 4, isFoundation: true },
  { id: 'pad-cow-memphis', name: 'Memphis Bell', nameJa: 'メンフィスCB', category: 'cowbell', preset: 'cow_memphis', color: '#ddaa00', colorDark: '#886600', shortLabel: 'MEM', gridIndex: 5, isFoundation: true },

  // ── Core short（4×4）──
  { id: 'pad-hat-cl', name: 'Trap CH', nameJa: 'CH', category: 'hat', preset: 'hat_closed', color: '#44ddff', colorDark: '#0088aa', shortLabel: 'CH', gridIndex: 10 },
  { id: 'pad-hat-op', name: 'Trap OH', nameJa: 'OH', category: 'hat', preset: 'hat_open', color: '#22bbee', colorDark: '#006688', shortLabel: 'OH', gridIndex: 11 },
  { id: 'pad-ride', name: 'Hat Roll', nameJa: 'ロール', category: 'hat', preset: 'ride', color: '#3399dd', colorDark: '#115588', shortLabel: 'ROLL', gridIndex: 12 },
  { id: 'pad-shaker', name: 'Vinyl', nameJa: 'レコード', category: 'fx', preset: 'shaker', color: '#888899', colorDark: '#444455', shortLabel: 'VNL', gridIndex: 13 },
  { id: 'pad-snare', name: 'Phonk Snare', nameJa: 'スネア', category: 'snare', preset: 'snare_edm', color: '#ff6633', colorDark: '#cc3311', shortLabel: 'SNR', gridIndex: 14 },
  { id: 'pad-rim', name: 'Rim', nameJa: 'リム', category: 'snare', preset: 'rim', color: '#ff8844', colorDark: '#aa5522', shortLabel: 'RIM', gridIndex: 15 },
  { id: 'pad-tom', name: '808 Tom', nameJa: 'タム', category: 'perc', preset: 'tom', color: '#cc4433', colorDark: '#882211', shortLabel: 'TOM', gridIndex: 16 },
  { id: 'pad-conga', name: 'Snap', nameJa: 'スナップ', category: 'perc', preset: 'conga', color: '#aa6644', colorDark: '#664422', shortLabel: 'SNAP', gridIndex: 17 },
  { id: 'pad-stab', name: 'Dark Chord', nameJa: 'ダーク和音', category: 'synth', preset: 'stab', color: '#cc22ff', colorDark: '#7700aa', shortLabel: 'CHRD', gridIndex: 18 },
  { id: 'pad-pluck', name: 'Bell Melody', nameJa: 'ベル', category: 'cowbell', preset: 'pluck', color: '#ff44aa', colorDark: '#aa1166', shortLabel: 'BELL', gridIndex: 19 },
  { id: 'pad-rise', name: 'Riser', nameJa: 'ライザー', category: 'fx', preset: 'riser', color: '#44ff88', colorDark: '#22aa55', shortLabel: 'RISE', gridIndex: 20 },
  { id: 'pad-crash', name: 'Impact', nameJa: 'インパクト', category: 'fx', preset: 'crash', color: '#aaff22', colorDark: '#668811', shortLabel: 'HIT', gridIndex: 21 },

  // ── Phonk ──
  { id: 'pad-kick-phonk', name: 'Phonk Kick', nameJa: 'Phonk K', category: 'kick', preset: 'kick_phonk', color: '#cc1133', colorDark: '#880022', shortLabel: 'PHK', gridIndex: 30 },
  { id: 'pad-hat-phonk', name: 'Phonk Hat', nameJa: 'Phonk HH', category: 'hat', preset: 'hat_phonk', color: '#55ccff', colorDark: '#2288aa', shortLabel: 'PHH', gridIndex: 31 },
  { id: 'pad-snare-phonk', name: 'Drift Snare', nameJa: 'ドリフトSN', category: 'snare', preset: 'snare_phonk', color: '#ff5522', colorDark: '#aa3311', shortLabel: 'DRF', gridIndex: 32 },
  { id: 'pad-bass-phonk', name: 'Dist Bass', nameJa: '歪みBass', category: 'bass', preset: 'bass_phonk', color: '#9933ff', colorDark: '#5511aa', shortLabel: 'DST', gridIndex: 33 },
  { id: 'pad-synth-memphis', name: 'Memphis Lead', nameJa: 'メンフィス', category: 'synth', preset: 'synth_memphis', color: '#ff2288', colorDark: '#aa1155', shortLabel: 'MEMP', gridIndex: 34 },
  { id: 'pad-fx-gun', name: 'Gun FX', nameJa: 'ガンFX', category: 'fx', preset: 'fx_gun', color: '#aaaaaa', colorDark: '#555555', shortLabel: 'GUN', gridIndex: 35 },
  { id: 'pad-vinyl-crack', name: 'Tape Hiss', nameJa: 'テープ', category: 'fx', preset: 'vinyl_crackle', color: '#998877', colorDark: '#554433', shortLabel: 'TAPE', gridIndex: 36 },

  // ── EDM ──
  { id: 'pad-kick-bigroom', name: 'Big Room Kick', nameJa: 'Big K', category: 'kick', preset: 'kick_bigroom', color: '#00ccff', colorDark: '#0088aa', shortLabel: 'BIG', gridIndex: 40 },
  { id: 'pad-clap-edm', name: 'EDM Clap', nameJa: 'EDM Clap', category: 'clap', preset: 'clap_edm2', color: '#44ddff', colorDark: '#2299bb', shortLabel: 'ECLP', gridIndex: 41 },
  { id: 'pad-hat-edm', name: 'EDM Hat', nameJa: 'EDM HH', category: 'hat', preset: 'hat_edm', color: '#66eeff', colorDark: '#33aacc', shortLabel: 'HHED', gridIndex: 42 },
  { id: 'pad-snare-big', name: 'Big Snare', nameJa: 'Big SN', category: 'snare', preset: 'snare_bigroom', color: '#ff66aa', colorDark: '#cc3388', shortLabel: 'BGSN', gridIndex: 43 },
  { id: 'pad-bass-pluck', name: 'Pluck Bass', nameJa: 'Pluck', category: 'bass', preset: 'bass_pluck_edm', color: '#aa44ff', colorDark: '#6622cc', shortLabel: 'PLUK', gridIndex: 44 },
  { id: 'pad-synth-saw', name: 'Supersaw', nameJa: 'Saw', category: 'synth', preset: 'synth_supersaw', color: '#ff44cc', colorDark: '#aa2288', shortLabel: 'SAW', gridIndex: 45 },
  { id: 'pad-synth-arp', name: 'Arp', nameJa: 'Arp', category: 'synth', preset: 'synth_arp_edm', color: '#cc66ff', colorDark: '#8833cc', shortLabel: 'ARP', gridIndex: 46 },
  { id: 'pad-fx-drop', name: 'Drop Hit', nameJa: 'Drop', category: 'fx', preset: 'fx_drop', color: '#ffaa44', colorDark: '#cc7722', shortLabel: 'DROP', gridIndex: 47 },
  { id: 'pad-kick-house', name: 'House Kick', nameJa: 'House K', category: 'kick', preset: 'kick_house', color: '#22ffaa', colorDark: '#11aa66', shortLabel: 'HSE', gridIndex: 50 },
  { id: 'pad-hat-shuffle', name: 'Shuffle Hat', nameJa: 'Shuffle', category: 'hat', preset: 'hat_shuffle_edm', color: '#55ffcc', colorDark: '#22aa88', shortLabel: 'SHUF', gridIndex: 51 },
  { id: 'pad-snare-layer', name: 'Snare Layer', nameJa: 'SN Layer', category: 'snare', preset: 'snare_layer', color: '#ff5588', colorDark: '#cc3366', shortLabel: 'SNLY', gridIndex: 52 },
  { id: 'pad-bass-side', name: 'Side Bass', nameJa: 'Side', category: 'bass', preset: 'bass_sidechain', color: '#3388ff', colorDark: '#2255cc', shortLabel: 'SIDE', gridIndex: 53 },
  { id: 'pad-synth-lead', name: 'EDM Lead', nameJa: 'Lead', category: 'synth', preset: 'synth_lead_edm', color: '#ff66ff', colorDark: '#cc33cc', shortLabel: 'LED', gridIndex: 54 },
  { id: 'pad-fx-uplift', name: 'Uplifter', nameJa: 'Lift', category: 'fx', preset: 'fx_uplift', color: '#aaff66', colorDark: '#66cc33', shortLabel: 'LIFT', gridIndex: 55 },

  // ── Extra shorts ──
  { id: 'pad-clap-trap', name: 'Trap Clap', nameJa: 'Trap Clap', category: 'clap', preset: 'clap_trap', color: '#ffcc66', colorDark: '#aa8833', shortLabel: 'TCL', gridIndex: 60 },
  { id: 'pad-hat-trap16', name: '16th Hat', nameJa: '16分HH', category: 'hat', preset: 'hat_trap16', color: '#55eeff', colorDark: '#2299bb', shortLabel: '16H', gridIndex: 61 },
  { id: 'pad-perc-ghost', name: 'Ghost Note', nameJa: 'ゴースト', category: 'perc', preset: 'perc_ghost', color: '#bb8866', colorDark: '#775544', shortLabel: 'GHO', gridIndex: 62 },
  { id: 'pad-fx-reverse', name: 'Reverse', nameJa: 'リバース', category: 'fx', preset: 'fx_reverse', color: '#aa88ff', colorDark: '#6655cc', shortLabel: 'REV', gridIndex: 63 },

  // ── Long loops — Phonk ──
  { id: 'pad-long-trap-808', name: '808 Pattern', nameJa: '808パターン', category: 'kick', preset: 'long_trap_808', color: '#ee2244', colorDark: '#991122', shortLabel: '8PAT', gridIndex: 115, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-bass', name: '808 Loop', nameJa: '808Loop', category: 'bass', preset: 'long_bass', color: '#6622dd', colorDark: '#331188', shortLabel: '8LOOP', gridIndex: 101, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-lead', name: 'Phonk Lead', nameJa: 'PhonkLead', category: 'synth', preset: 'long_lead', color: '#ff2288', colorDark: '#aa1155', shortLabel: 'LEAD', gridIndex: 102, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk', name: 'Memphis Pad', nameJa: 'MemphisPad', category: 'synth', preset: 'long_phonk_pad', color: '#cc2288', colorDark: '#881155', shortLabel: 'MPAD', gridIndex: 106, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-cow', name: 'Cowbell Loop', nameJa: 'CBループ', category: 'cowbell', preset: 'long_cow_loop', color: '#ddbb22', colorDark: '#887711', shortLabel: 'CBLP', gridIndex: 111, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-vinyl', name: 'Vinyl Loop', nameJa: 'レコードLoop', category: 'fx', preset: 'long_vinyl', color: '#999988', colorDark: '#555544', shortLabel: 'VLOOP', gridIndex: 116, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk-kick', name: 'Phonk Kick Loop', nameJa: 'PH Kick', category: 'kick', preset: 'long_phonk_kick', color: '#cc1133', colorDark: '#880022', shortLabel: 'PH808', gridIndex: 120, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk-drums', name: 'Phonk Drums', nameJa: 'PH Drums', category: 'snare', preset: 'long_phonk_drums', color: '#ff5522', colorDark: '#aa3311', shortLabel: 'PHDRM', gridIndex: 121, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk-dst', name: 'Dist Bass Loop', nameJa: 'PH Bass', category: 'bass', preset: 'long_phonk_bass', color: '#9933ff', colorDark: '#5511aa', shortLabel: 'PHDST', gridIndex: 122, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk-mem', name: 'Memphis Melody', nameJa: 'PH Melo', category: 'synth', preset: 'long_phonk_memphis', color: '#ff2288', colorDark: '#aa1155', shortLabel: 'PHMEM', gridIndex: 123, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-phonk-hats', name: 'Phonk Hats', nameJa: 'PH Hats', category: 'hat', preset: 'long_phonk_hats', color: '#55ccff', colorDark: '#2288aa', shortLabel: 'PHHH', gridIndex: 124, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-steady-808', name: 'Steady 808', nameJa: '固定808', category: 'kick', preset: 'long_steady_phonk_kick', color: '#bb1133', colorDark: '#770022', shortLabel: 'ST808', gridIndex: 140, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-steady-ph-sn', name: 'Steady Snare', nameJa: '固定SN', category: 'snare', preset: 'long_steady_phonk_snare', color: '#dd4422', colorDark: '#992211', shortLabel: 'STPSN', gridIndex: 141, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-steady-ph-hh', name: 'Steady Hats', nameJa: '固定HH', category: 'hat', preset: 'long_steady_phonk_hat', color: '#44bbee', colorDark: '#2288aa', shortLabel: 'STPHH', gridIndex: 142, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-steady-ph-bs', name: 'Steady Bass', nameJa: '固定Bass', category: 'bass', preset: 'long_steady_phonk_bass', color: '#8822dd', colorDark: '#5511aa', shortLabel: 'STPBS', gridIndex: 143, isLong: true, longGenre: 'phonk' },
  { id: 'pad-long-steady-cb', name: 'Steady Cowbell', nameJa: '固定CB', category: 'cowbell', preset: 'long_steady_cow', color: '#ccaa22', colorDark: '#887711', shortLabel: 'STCB', gridIndex: 144, isLong: true, longGenre: 'phonk' },

  // ── Long loops — EDM ──
  { id: 'pad-long-saw', name: 'Saw Pad', nameJa: 'SawPad', category: 'synth', preset: 'long_supersaw', color: '#2288ff', colorDark: '#1155aa', shortLabel: 'SAW', gridIndex: 109, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-arp', name: 'Arp Loop', nameJa: 'ArpLoop', category: 'synth', preset: 'long_arp', color: '#ddaa44', colorDark: '#886622', shortLabel: 'ARP', gridIndex: 108, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-side', name: 'Side Bass', nameJa: 'SideLoop', category: 'bass', preset: 'long_sidechain', color: '#33aaee', colorDark: '#2266aa', shortLabel: 'SIDE', gridIndex: 105, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-reese', name: 'Wub Bass', nameJa: 'Wub', category: 'bass', preset: 'long_wub', color: '#5533ee', colorDark: '#331199', shortLabel: 'WUB', gridIndex: 104, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-groove', name: 'EDM Groove', nameJa: 'EDM Groove', category: 'clap', preset: 'long_edm_groove', color: '#ffaa44', colorDark: '#aa6622', shortLabel: 'EDMGR', gridIndex: 113, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-build', name: 'Build Up', nameJa: 'Build', category: 'snare', preset: 'long_edm_build', color: '#ff5544', colorDark: '#aa3322', shortLabel: 'BLD', gridIndex: 114, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-hats', name: 'Hat Groove', nameJa: 'HHグルーヴ', category: 'hat', preset: 'long_hat_groove', color: '#44ccee', colorDark: '#228899', shortLabel: 'HHGR', gridIndex: 112, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-big', name: 'Big Room Loop', nameJa: 'BigRoom', category: 'kick', preset: 'long_edm_bigroom', color: '#00ccff', colorDark: '#0088aa', shortLabel: 'BGRM', gridIndex: 130, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-house', name: 'House Loop', nameJa: 'House', category: 'kick', preset: 'long_edm_house', color: '#22ffaa', colorDark: '#11aa66', shortLabel: 'HSELP', gridIndex: 131, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-pluck', name: 'Pluck Loop', nameJa: 'PluckLp', category: 'bass', preset: 'long_edm_pluck', color: '#aa44ff', colorDark: '#6622cc', shortLabel: 'PLKLP', gridIndex: 132, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-chord', name: 'Chord Loop', nameJa: 'ChordLp', category: 'synth', preset: 'long_edm_chord', color: '#ff44cc', colorDark: '#aa2288', shortLabel: 'CHDLP', gridIndex: 133, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-lead', name: 'Lead Loop', nameJa: 'LeadLp', category: 'synth', preset: 'long_edm_lead', color: '#ff66ff', colorDark: '#cc33cc', shortLabel: 'LEDLP', gridIndex: 134, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-edm-hats', name: 'EDM Hats', nameJa: 'EDM Hats', category: 'hat', preset: 'long_edm_hats', color: '#66eeff', colorDark: '#33aacc', shortLabel: 'EDMHH', gridIndex: 135, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-k', name: 'Steady Kick', nameJa: '固定Kick', category: 'kick', preset: 'long_steady_edm_kick', color: '#00bbee', colorDark: '#0077aa', shortLabel: 'STEDK', gridIndex: 150, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-c', name: 'Steady Clap', nameJa: '固定Clap', category: 'clap', preset: 'long_steady_edm_clap', color: '#33ccee', colorDark: '#2299bb', shortLabel: 'STEDC', gridIndex: 151, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-h', name: 'Steady Hat', nameJa: '固定Hat', category: 'hat', preset: 'long_steady_edm_hat', color: '#55ddff', colorDark: '#33aacc', shortLabel: 'STEDH', gridIndex: 152, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-b', name: 'Steady Bass', nameJa: '固定Bass', category: 'bass', preset: 'long_steady_edm_bass', color: '#2288ee', colorDark: '#1155bb', shortLabel: 'STEDB', gridIndex: 153, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-s', name: 'Steady Saw', nameJa: '固定Saw', category: 'synth', preset: 'long_steady_edm_saw', color: '#ee44bb', colorDark: '#aa2288', shortLabel: 'STEDS', gridIndex: 154, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-p', name: 'Steady Pluck', nameJa: '固定Pluck', category: 'bass', preset: 'long_steady_edm_pluck', color: '#bb55ee', colorDark: '#7733bb', shortLabel: 'STEDP', gridIndex: 155, isLong: true, longGenre: 'edm' },
  { id: 'pad-long-steady-edm-16', name: 'Steady 16th HH', nameJa: '固定16HH', category: 'hat', preset: 'long_steady_edm_16hat', color: '#77eeff', colorDark: '#44bbcc', shortLabel: 'ST16H', gridIndex: 156, isLong: true, longGenre: 'edm' },

  // ── Long loops — 共通 ──
  { id: 'pad-long-pad', name: 'Dark Pad', nameJa: '闇Pad', category: 'synth', preset: 'long_pad', color: '#4422cc', colorDark: '#221166', shortLabel: 'DPAD', gridIndex: 100, isLong: true, longGenre: 'common' },
  { id: 'pad-long-wash', name: 'Atmosphere', nameJa: '雰囲気FX', category: 'fx', preset: 'long_wash', color: '#22ccaa', colorDark: '#118866', shortLabel: 'ATM', gridIndex: 103, isLong: true, longGenre: 'common' },
  { id: 'pad-long-strings', name: 'Dark Strings', nameJa: '弦楽器', category: 'synth', preset: 'long_strings', color: '#6644aa', colorDark: '#442266', shortLabel: 'STR', gridIndex: 107, isLong: true, longGenre: 'common' },
  { id: 'pad-long-choir', name: 'Choir', nameJa: 'クワイア', category: 'synth', preset: 'long_choir', color: '#aa66cc', colorDark: '#664488', shortLabel: 'CHR', gridIndex: 110, isLong: true, longGenre: 'common' },
  { id: 'pad-long-steady-pad', name: 'Steady Pad', nameJa: '固定Pad', category: 'synth', preset: 'long_steady_pad', color: '#5533cc', colorDark: '#331188', shortLabel: 'STPAD', gridIndex: 160, isLong: true, longGenre: 'common' },
  { id: 'pad-long-steady-wash', name: 'Steady Atmos', nameJa: '固定Atmos', category: 'fx', preset: 'long_steady_wash', color: '#22bb99', colorDark: '#118866', shortLabel: 'STATM', gridIndex: 161, isLong: true, longGenre: 'common' },

  // ── Example-only pads (Volento-style demo) ──
  { id: 'pad-ex-volento-kick', name: 'Volento 808', nameJa: 'Volento 808', category: 'kick', preset: 'volento_kick', color: '#aa0022', colorDark: '#660011', shortLabel: 'V808', gridIndex: 900, isExample: true },
  { id: 'pad-ex-volento-hat', name: 'Volento Hat', nameJa: 'Volento HH', category: 'hat', preset: 'volento_hat', color: '#44aacc', colorDark: '#226688', shortLabel: 'VHH', gridIndex: 901, isExample: true },
  { id: 'pad-ex-volento-vinyl', name: 'Volento Tape', nameJa: 'Volento Tape', category: 'fx', preset: 'volento_vinyl', color: '#887766', colorDark: '#554433', shortLabel: 'VTAP', gridIndex: 902, isExample: true },
  { id: 'pad-ex-volento-snare', name: 'Volento Snare', nameJa: 'Volento SN', category: 'snare', preset: 'volento_snare', color: '#dd4422', colorDark: '#992211', shortLabel: 'VSN', gridIndex: 903, isExample: true },
  { id: 'pad-ex-volento-bass', name: 'Volento Bass', nameJa: 'Volento Bass', category: 'bass', preset: 'volento_bass', color: '#7722cc', colorDark: '#440088', shortLabel: 'VBS', gridIndex: 904, isExample: true },
  { id: 'pad-ex-volento-memphis', name: 'Volento Lead', nameJa: 'Volento Lead', category: 'synth', preset: 'volento_memphis', color: '#ee2288', colorDark: '#aa1155', shortLabel: 'VLD', gridIndex: 905, isExample: true },
  { id: 'pad-ex-volento-cow', name: 'Volento Bell', nameJa: 'Volento CB', category: 'cowbell', preset: 'volento_cowbell', color: '#ccaa00', colorDark: '#886600', shortLabel: 'VCB', gridIndex: 906, isExample: true },
  { id: 'pad-ex-volento-kick-l', name: 'Volento Kick L', nameJa: 'Volento K Loop', category: 'kick', preset: 'long_volento_kick', color: '#bb0022', colorDark: '#770011', shortLabel: 'VKLP', gridIndex: 907, isLong: true, isExample: true },
  { id: 'pad-ex-volento-snare-l', name: 'Volento Snare L', nameJa: 'Volento SN Loop', category: 'snare', preset: 'long_volento_snare', color: '#cc3311', colorDark: '#881100', shortLabel: 'VSLP', gridIndex: 908, isLong: true, isExample: true },
  { id: 'pad-ex-volento-hat-l', name: 'Volento Hat L', nameJa: 'Volento HH Loop', category: 'hat', preset: 'long_volento_hat', color: '#3399bb', colorDark: '#115577', shortLabel: 'VHLP', gridIndex: 909, isLong: true, isExample: true },
  { id: 'pad-ex-volento-bass-l', name: 'Volento Bass L', nameJa: 'Volento Bass Loop', category: 'bass', preset: 'long_volento_bass', color: '#6611bb', colorDark: '#330077', shortLabel: 'VBLP', gridIndex: 910, isLong: true, isExample: true },
  { id: 'pad-ex-volento-mem-l', name: 'Volento Melo L', nameJa: 'Volento Melo', category: 'synth', preset: 'long_volento_memphis', color: '#dd1188', colorDark: '#990055', shortLabel: 'VMLP', gridIndex: 911, isLong: true, isExample: true },
  { id: 'pad-ex-volento-cow-l', name: 'Volento Bell L', nameJa: 'Volento CB Loop', category: 'cowbell', preset: 'long_volento_cow', color: '#bbaa00', colorDark: '#776600', shortLabel: 'VCLP', gridIndex: 912, isLong: true, isExample: true },
  { id: 'pad-ex-volento-gun', name: 'Volento Gun', nameJa: 'Volento Gun', category: 'fx', preset: 'volento_gun', color: '#888888', colorDark: '#444444', shortLabel: 'VGUN', gridIndex: 914, isExample: true },

  // ── Example-only pads (Xlowly-style drift phonk demo) ──
  { id: 'pad-ex-xlow-kick', name: 'Drift Kick', nameJa: 'Drift Kick', category: 'kick', preset: 'xlowly_kick', color: '#cc1133', colorDark: '#880022', shortLabel: 'DKCK', gridIndex: 940, isExample: true },
  { id: 'pad-ex-xlow-hat', name: 'Drift Hat', nameJa: 'Drift HH', category: 'hat', preset: 'xlowly_hat', color: '#44bbee', colorDark: '#2288aa', shortLabel: 'DKHH', gridIndex: 941, isExample: true },
  { id: 'pad-ex-xlow-snare', name: 'Drift Snare', nameJa: 'Drift SN', category: 'snare', preset: 'xlowly_snare', color: '#dd4422', colorDark: '#992211', shortLabel: 'DKSN', gridIndex: 942, isExample: true },
  { id: 'pad-ex-xlow-bass', name: 'Drift 808', nameJa: 'Drift 808', category: 'bass', preset: 'xlowly_bass', color: '#7722cc', colorDark: '#440088', shortLabel: 'DK808', gridIndex: 943, isExample: true },
  { id: 'pad-ex-xlow-cow', name: 'Drift Cow', nameJa: 'Drift CB', category: 'cowbell', preset: 'xlowly_cow', color: '#ddcc22', colorDark: '#998811', shortLabel: 'DKCB', gridIndex: 944, isExample: true },
  { id: 'pad-ex-xlow-vinyl', name: 'Drift Tape', nameJa: 'Drift Tape', category: 'fx', preset: 'xlowly_vinyl', color: '#887766', colorDark: '#554433', shortLabel: 'DKTP', gridIndex: 945, isExample: true },
  { id: 'pad-ex-xlow-kick-l', name: 'Drift Kick L', nameJa: 'Drift K Loop', category: 'kick', preset: 'long_xlowly_kick', color: '#bb1133', colorDark: '#770022', shortLabel: 'DKKLP', gridIndex: 946, isLong: true, isExample: true },
  { id: 'pad-ex-xlow-hat-l', name: 'Drift HH L', nameJa: 'Drift HH Loop', category: 'hat', preset: 'long_xlowly_hat', color: '#3399cc', colorDark: '#115577', shortLabel: 'DKHLP', gridIndex: 947, isLong: true, isExample: true },
  { id: 'pad-ex-xlow-bass-l', name: 'Drift 808 L', nameJa: 'Drift 808 Loop', category: 'bass', preset: 'long_xlowly_bass', color: '#6611bb', colorDark: '#330077', shortLabel: 'DK8LP', gridIndex: 948, isLong: true, isExample: true },
  { id: 'pad-ex-xlow-cow-l', name: 'Drift Cow L', nameJa: 'Drift CB Loop', category: 'cowbell', preset: 'long_xlowly_cow', color: '#ccbb00', colorDark: '#887700', shortLabel: 'DKCLP', gridIndex: 949, isLong: true, isExample: true },
  { id: 'pad-ex-xlow-snare-l', name: 'Drift SN L', nameJa: 'Drift SN Loop', category: 'snare', preset: 'long_xlowly_snare', color: '#cc3311', colorDark: '#881100', shortLabel: 'DKSLP', gridIndex: 950, isLong: true, isExample: true },

  // ── Example-only pads (Discipline-style industrial demo) ──
  { id: 'pad-ex-disc-kick', name: 'Disc Kick', nameJa: 'Disc Kick', category: 'kick', preset: 'discipline_kick', color: '#cc4400', colorDark: '#882200', shortLabel: 'DK', gridIndex: 920, isExample: true },
  { id: 'pad-ex-disc-hat', name: 'Disc HH', nameJa: 'Disc HH', category: 'hat', preset: 'discipline_hat', color: '#8899aa', colorDark: '#556677', shortLabel: 'DHH', gridIndex: 921, isExample: true },
  { id: 'pad-ex-disc-hat16', name: 'Disc 16HH', nameJa: 'Disc 16HH', category: 'hat', preset: 'discipline_hat16', color: '#99aabb', colorDark: '#667788', shortLabel: 'D16', gridIndex: 922, isExample: true },
  { id: 'pad-ex-disc-snare', name: 'Disc Snare', nameJa: 'Disc SN', category: 'snare', preset: 'discipline_snare', color: '#dd6633', colorDark: '#994422', shortLabel: 'DSN', gridIndex: 923, isExample: true },
  { id: 'pad-ex-disc-rim', name: 'Disc Rim', nameJa: 'Disc Rim', category: 'snare', preset: 'discipline_rim', color: '#aa7755', colorDark: '#775533', shortLabel: 'DRM', gridIndex: 924, isExample: true },
  { id: 'pad-ex-disc-bass', name: 'Disc Bass', nameJa: 'Disc Bass', category: 'bass', preset: 'discipline_bass', color: '#556677', colorDark: '#334455', shortLabel: 'DBS', gridIndex: 925, isExample: true },
  { id: 'pad-ex-disc-riff', name: 'Disc Riff', nameJa: 'Disc Riff', category: 'synth', preset: 'discipline_riff', color: '#ee8844', colorDark: '#bb5522', shortLabel: 'DRF', gridIndex: 926, isExample: true },
  { id: 'pad-ex-disc-clap', name: 'Disc Clap', nameJa: 'Disc Clap', category: 'clap', preset: 'discipline_clap', color: '#cc8866', colorDark: '#885544', shortLabel: 'DCL', gridIndex: 927, isExample: true },
  { id: 'pad-ex-disc-perc', name: 'Disc Perc', nameJa: 'Disc Perc', category: 'perc', preset: 'discipline_perc', color: '#aa6644', colorDark: '#774433', shortLabel: 'DPC', gridIndex: 928, isExample: true },
  { id: 'pad-ex-disc-tom', name: 'Disc Tom', nameJa: 'Disc Tom', category: 'perc', preset: 'discipline_tom', color: '#996655', colorDark: '#664433', shortLabel: 'DTM', gridIndex: 929, isExample: true },
  { id: 'pad-ex-disc-shaker', name: 'Disc Shake', nameJa: 'Disc Shake', category: 'fx', preset: 'discipline_shaker', color: '#778899', colorDark: '#445566', shortLabel: 'DSK', gridIndex: 930, isExample: true },
  { id: 'pad-ex-disc-kick-l', name: 'Disc Kick L', nameJa: 'Disc K Loop', category: 'kick', preset: 'long_discipline_kick', color: '#bb4400', colorDark: '#771100', shortLabel: 'DKLP', gridIndex: 931, isLong: true, isExample: true },
  { id: 'pad-ex-disc-snare-l', name: 'Disc Snare L', nameJa: 'Disc SN Loop', category: 'snare', preset: 'long_discipline_snare', color: '#cc5522', colorDark: '#883311', shortLabel: 'DSLP', gridIndex: 932, isLong: true, isExample: true },
  { id: 'pad-ex-disc-hat-l', name: 'Disc HH L', nameJa: 'Disc HH Loop', category: 'hat', preset: 'long_discipline_hat', color: '#778899', colorDark: '#445566', shortLabel: 'DHLP', gridIndex: 933, isLong: true, isExample: true },
  { id: 'pad-ex-disc-hat16-l', name: 'Disc 16HH L', nameJa: 'Disc 16 Loop', category: 'hat', preset: 'long_discipline_hat16', color: '#8899aa', colorDark: '#556677', shortLabel: 'D16L', gridIndex: 934, isLong: true, isExample: true },
  { id: 'pad-ex-disc-bass-l', name: 'Disc Bass L', nameJa: 'Disc Bass Loop', category: 'bass', preset: 'long_discipline_bass', color: '#445566', colorDark: '#223344', shortLabel: 'DBLP', gridIndex: 935, isLong: true, isExample: true },
  { id: 'pad-ex-disc-riff-l', name: 'Disc Riff L', nameJa: 'Disc Riff Loop', category: 'synth', preset: 'long_discipline_riff', color: '#dd7733', colorDark: '#aa4411', shortLabel: 'DRLP', gridIndex: 936, isLong: true, isExample: true },
  { id: 'pad-ex-disc-rim-l', name: 'Disc Rim L', nameJa: 'Disc Rim Loop', category: 'snare', preset: 'long_discipline_rim', color: '#997755', colorDark: '#664433', shortLabel: 'DRMLP', gridIndex: 937, isLong: true, isExample: true },
  { id: 'pad-ex-disc-pluck-l', name: 'Disc Pluck L', nameJa: 'Disc Pluck Loop', category: 'bass', preset: 'long_discipline_pluck', color: '#668899', colorDark: '#445566', shortLabel: 'DPLP', gridIndex: 938, isLong: true, isExample: true },
];

export const VIRTUAL_PART_LOOP_ID = 'pad-hat-cl';

export function getPadById(id: string): PadDefinition | undefined {
  return PAD_PACK.find((p) => p.id === id);
}

export function getLoopById(id: string): PadDefinition | undefined {
  return getPadById(id);
}

export function getFoundationPads(): PadDefinition[] {
  return PAD_PACK.filter((p) => p.isFoundation && !p.isExample);
}

export function getFoundationLoops(): PadDefinition[] {
  return getFoundationPads();
}

export function getLayerPads(excludeIds: string[] = []): PadDefinition[] {
  return PAD_PACK.filter((p) => !p.isFoundation && !p.isLong && !p.isExample && !excludeIds.includes(p.id));
}

export function getLongPads(excludeIds: string[] = []): PadDefinition[] {
  return PAD_PACK.filter((p) => p.isLong && !p.isExample && !excludeIds.includes(p.id));
}

export type LongGenreGroup = 'phonk' | 'edm' | 'common';

export const LONG_GENRE_LABELS: Record<LongGenreGroup, string> = {
  phonk: '🔥 Phonk（4小節）',
  edm: '🎧 EDM（4小節）',
  common: '🌫 その他（4小節）',
};

export function getLongPadsByGenre(genre: LongGenreGroup, excludeIds: string[] = []): PadDefinition[] {
  return getLongPads(excludeIds)
    .filter((p) => (p.longGenre ?? 'common') === genre)
    .sort((a, b) => a.gridIndex - b.gridIndex);
}

/** @deprecated use LongGenreGroup */
export type LongPadGroup = LongGenreGroup;

/** @deprecated use LONG_GENRE_LABELS */
export const LONG_GROUP_LABELS = LONG_GENRE_LABELS;

/** @deprecated use getLongPadsByGenre */
export function getLongPadsByGroup(group: LongGenreGroup, excludeIds: string[] = []): PadDefinition[] {
  return getLongPadsByGenre(group, excludeIds);
}

export function getShortPads(excludeIds: string[] = []): PadDefinition[] {
  return PAD_PACK.filter((p) => !p.isFoundation && !p.isLong && !excludeIds.includes(p.id));
}

export type PadGroup = 'core' | 'phonk' | 'edm' | 'extra';

const PAD_GROUP_RANGES: Record<PadGroup, [number, number]> = {
  core: [10, 29],
  phonk: [30, 39],
  edm: [40, 59],
  extra: [60, 69],
};

export const PAD_GROUP_LABELS: Record<PadGroup, string> = {
  core: '🎹 基本',
  phonk: '🔥 Phonk',
  edm: '🎧 EDM',
  extra: '✨ その他',
};

export function getPadsByGroup(group: PadGroup, excludeIds: string[] = []): PadDefinition[] {
  const [min, max] = PAD_GROUP_RANGES[group];
  return getShortPads(excludeIds).filter((p) => p.gridIndex >= min && p.gridIndex <= max);
}

export function getLayerLoops(excludeIds: string[] = []): PadDefinition[] {
  return getLayerPads(excludeIds);
}

export function getPadsForGrid(excludeIds: string[] = [], foundationOnly = false): PadDefinition[] {
  const list = foundationOnly
    ? getFoundationPads()
    : PAD_PACK.filter((p) => !p.isExample && !excludeIds.includes(p.id));
  return [...list].sort((a, b) => a.gridIndex - b.gridIndex);
}

/** @deprecated */
export const LOOP_PACK = PAD_PACK;
