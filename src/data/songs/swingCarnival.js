import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Swing_Carnival.mp3', import.meta.url).href;

const BPM = 111;
const DURATION = 69.8;
const BEAT_OFFSET = 0;

const BASE_PATTERN = Object.freeze(['left', 'down', 'right', 'up', 'down', 'left', 'up', 'right']);
const SWING_PATTERN = Object.freeze(['up', 'right', 'down', 'left', 'right', 'up', 'left', 'down']);
const TRIPLET_PATTERN = Object.freeze(['left', 'up', 'right', 'down']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '四分音符與留白 · 無雙押', scrollSpeed: 380 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '短段搖擺切分 · 無雙押', scrollSpeed: 400 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '完整搖擺句 · 6 組雙押', scrollSpeed: 420 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '三連音填充 · 16 組雙押', scrollSpeed: 435 }),
]);

const chartSet = createTapChartSet({
  songId: 'swing-carnival',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'swing',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble, addHold }) {
    addRange({ start: 8, end: 124, step: 1, pattern: BASE_PATTERN, skipEvery: 4 });
    addNote(126, 'right');

    if (level >= 2) {
      [[16, 32], [48, 64], [88, 96]].forEach(([start, end], index) => {
        addRange({ start: start + 2 / 3, end, step: 1, pattern: SWING_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      [[32, 48], [64, 80], [96, 104]].forEach(([start, end], index) => {
        addRange({ start: start + 2 / 3, end, step: 1, pattern: SWING_PATTERN, patternOffset: index + 2 });
      });
      [16, 32, 48, 64, 88, 104].forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      addRange({ start: 8 + 2 / 3, end: 124, step: 1, pattern: SWING_PATTERN });
      [[24, 32], [72, 80]].forEach(([start, end], index) => {
        addRange({ start: start + 1 / 3, end, step: 1, pattern: TRIPLET_PATTERN, patternOffset: index });
      });
      [16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 108, 112, 116, 120]
        .forEach((beat) => addDouble(beat));

      // Expert introduces sustained runes on notes with free lane space after them.
      addHold(9, 'down', 1);
      addHold(13, 'left', 1);
      addHold(17, 'down', 1);
      addHold(22, 'up', 2);
      addHold(30, 'up', 2);
      addHold(37, 'left', 2);
    }
  },
});

export const SWING_CARNIVAL = Object.freeze({
  id: 'swing-carnival',
  title: '搖擺嘉年華',
  titleEn: 'Swing Carnival',
  artist: 'tingyusaiart',
  chapter: '第二章 · 星燈舞棚',
  sourceLabel: 'Suno 原創音樂',
  genre: '奇幻搖擺',
  key: 'G major',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  links: Object.freeze({
    mvUrl: 'https://youtu.be/rJTgA7F4yfU',
    musicUrl: 'https://tingyudeco.com/portfolio/music?song=vintage-swing-carnival',
  }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
