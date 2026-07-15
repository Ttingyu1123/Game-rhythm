import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Whimsical_Cute.mp3', import.meta.url).href;

const BPM = 122;
const DURATION = 112.88;
const BEAT_OFFSET = 0.416;

const CUTE_PATTERN = Object.freeze(['up', 'right', 'down', 'left', 'up', 'left', 'right', 'down']);
const HOP_PATTERN = Object.freeze(['down', 'up', 'left', 'right', 'down', 'right', 'left', 'up']);
const SKIP_PATTERN = Object.freeze(['left', 'right', 'up', 'down']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '輕快四分音符 · 無雙押', scrollSpeed: 380 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '副歌跳步八分音符 · 無雙押', scrollSpeed: 400 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '完整跳步句 · 9 組雙押', scrollSpeed: 420 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '十六分填充 · 20 組雙押', scrollSpeed: 438 }),
]);

const chartSet = createTapChartSet({
  songId: 'whimsical-cute',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'cute',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble, addHold }) {
    // Intro stays airy, the body follows the chorus lift at beat 80-112, the tail fades out.
    addRange({ start: 8, end: 16, step: 2, pattern: CUTE_PATTERN });
    addRange({ start: 16, end: 176, step: 1, pattern: CUTE_PATTERN, skipEvery: 4 });
    addRange({ start: 176, end: 216, step: 2, pattern: CUTE_PATTERN });
    addNote(216, 'up');

    if (level >= 2) {
      [[40, 64], [88, 104], [152, 164]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: HOP_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      [[16, 40], [64, 88], [104, 128], [144, 152]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: HOP_PATTERN, patternOffset: index + 2 });
      });
      [16, 32, 48, 64, 80, 96, 112, 144, 160].forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      addRange({ start: 16.5, end: 176, step: 1, pattern: HOP_PATTERN });
      [[88, 96], [152, 160]].forEach(([start, end], index) => {
        addRange({ start: start + 0.25, end, step: 1, pattern: SKIP_PATTERN, patternOffset: index });
      });
      [
        16, 24, 32, 40, 48, 56, 64, 72, 80, 88,
        96, 104, 112, 120, 128, 144, 152, 160, 168, 176,
      ].forEach((beat) => addDouble(beat));

      // Expert introduces sustained runes on notes with free lane space after them.
      addHold(8, 'up', 2);
      addHold(12, 'down', 2);
      addHold(21, 'left', 2);
      addHold(28, 'up', 1);
      addHold(36, 'up', 1);
      addHold(41, 'right', 2);
    }
  },
});

export const WHIMSICAL_CUTE = Object.freeze({
  id: 'whimsical-cute',
  title: '奇想甜心',
  titleEn: 'Whimsical Cute',
  artist: 'tingyusaiart',
  chapter: '第五章 · 糖霜幻境',
  sourceLabel: 'Suno 原創音樂',
  genre: '奇想甜心流行',
  key: 'C major',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  links: Object.freeze({
    mvUrl: 'https://youtube.com/shorts/2m5ZOkJEaoM',
  }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
