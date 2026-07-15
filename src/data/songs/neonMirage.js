import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Neon_Mirage.mp3', import.meta.url).href;

const BPM = 110;
const DURATION = 142.24;
const BEAT_OFFSET = 0.689;

const NEON_PATTERN = Object.freeze(['left', 'right', 'up', 'down', 'right', 'left', 'down', 'up']);
const MIRAGE_PATTERN = Object.freeze(['down', 'right', 'up', 'left', 'down', 'left', 'up', 'right']);
const PULSE_PATTERN = Object.freeze(['up', 'right', 'down', 'left']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '穩定四分脈衝 · 無雙押', scrollSpeed: 385 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '霓虹八分句 · 無雙押', scrollSpeed: 405 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '蜃樓推進句 · 10 組雙押', scrollSpeed: 425 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '高潮十六分填充 · 24 組雙押', scrollSpeed: 440 }),
]);

const chartSet = createTapChartSet({
  songId: 'neon-mirage',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'neon',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble, addHold }) {
    addRange({ start: 8, end: 16, step: 2, pattern: NEON_PATTERN });
    addRange({ start: 16, end: 252, step: 1, pattern: NEON_PATTERN, skipEvery: 4 });
    addNote(252, 'right');

    if (level >= 2) {
      [[40, 64], [112, 136], [184, 200]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: MIRAGE_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      // Beats 144-168 are the loudest stretch of the song, so the full run lands there.
      [[64, 88], [144, 168], [208, 232]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: MIRAGE_PATTERN, patternOffset: index + 2 });
      });
      [16, 40, 64, 88, 112, 144, 168, 184, 208, 232].forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      addRange({ start: 16.5, end: 252, step: 1, pattern: MIRAGE_PATTERN });
      [[144, 152], [232, 240]].forEach(([start, end], index) => {
        addRange({ start: start + 0.25, end, step: 1, pattern: PULSE_PATTERN, patternOffset: index });
      });
      [
        16, 24, 40, 48, 64, 72, 88, 96, 112, 120, 128, 144,
        152, 160, 168, 176, 184, 192, 208, 216, 224, 232, 240, 248,
      ].forEach((beat) => addDouble(beat));

      // Expert introduces sustained runes on notes with free lane space after them.
      addHold(8, 'left', 1);
      addHold(10, 'right', 1);
      addHold(12, 'up', 1);
      addHold(14, 'down', 1);
      addHold(96, 'left', 1);
      addHold(104, 'left', 2);
    }
  },
});

export const NEON_MIRAGE = Object.freeze({
  id: 'neon-mirage',
  title: '霓虹幻影',
  titleEn: 'Neon Mirage',
  artist: 'tingyusaiart',
  chapter: '第七章 · 霓虹蜃樓',
  sourceLabel: 'Suno 原創音樂',
  genre: '霓虹合成波',
  key: 'G# minor',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  links: Object.freeze({
    mvUrl: 'https://tingyudeco.com/portfolio/ai-films/neon-mirage-k-pop-music-video',
    // The music page slug carries a -1 suffix; plain neon-mirage does not exist there.
    musicUrl: 'https://tingyudeco.com/portfolio/music?song=neon-mirage-1',
  }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
