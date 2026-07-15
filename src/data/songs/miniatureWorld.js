import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Miniature_World.mp3', import.meta.url).href;

const BPM = 99.95;
const DURATION = 104.12;
const BEAT_OFFSET = 0.016;

const BOX_PATTERN = Object.freeze(['left', 'up', 'right', 'down', 'left', 'down', 'right', 'up']);
const SWIRL_PATTERN = Object.freeze(['up', 'left', 'down', 'right', 'up', 'right', 'down', 'left']);
const TRINKET_PATTERN = Object.freeze(['left', 'down', 'up', 'right']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '音樂盒四分音符與留白 · 無雙押', scrollSpeed: 370 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '旋轉八分音符 · 無雙押', scrollSpeed: 390 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '完整旋轉句 · 8 組雙押', scrollSpeed: 410 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '發條十六分填充 · 18 組雙押', scrollSpeed: 430 }),
]);

const chartSet = createTapChartSet({
  songId: 'miniature-world',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'mini',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble, addHold }) {
    // Beats 88-96 and 112-120 are the song's two quiet dips, so they thin out to half density.
    addRange({ start: 8, end: 16, step: 2, pattern: BOX_PATTERN });
    addRange({ start: 16, end: 88, step: 1, pattern: BOX_PATTERN, skipEvery: 4 });
    addRange({ start: 88, end: 96, step: 2, pattern: BOX_PATTERN });
    addRange({ start: 96, end: 112, step: 1, pattern: BOX_PATTERN, skipEvery: 4 });
    addRange({ start: 112, end: 120, step: 2, pattern: BOX_PATTERN });
    addRange({ start: 120, end: 168, step: 1, pattern: BOX_PATTERN, skipEvery: 4 });
    addNote(168, 'up');

    if (level >= 2) {
      [[64, 80], [120, 136], [144, 160]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: SWIRL_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      [[32, 48], [96, 112], [136, 144], [160, 168]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: SWIRL_PATTERN, patternOffset: index + 2 });
      });
      [16, 32, 48, 64, 80, 96, 120, 144].forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      addRange({ start: 16.5, end: 168, step: 1, pattern: SWIRL_PATTERN });
      [[64, 72], [144, 152]].forEach(([start, end], index) => {
        addRange({ start: start + 0.25, end, step: 1, pattern: TRINKET_PATTERN, patternOffset: index });
      });
      [
        16, 24, 32, 40, 48, 56, 64, 72, 80,
        88, 96, 104, 120, 128, 136, 144, 152, 160,
      ].forEach((beat) => addDouble(beat));

      // Expert introduces sustained runes on notes with free lane space after them.
      addHold(88, 'left', 1);
      addHold(90, 'up', 1);
      addHold(92, 'right', 1);
      addHold(112, 'left', 1);
      addHold(114, 'up', 1);
      addHold(116, 'right', 1);
    }
  },
});

export const MINIATURE_WORLD = Object.freeze({
  id: 'miniature-world',
  title: '微縮世界',
  titleEn: 'Miniature World',
  artist: 'tingyusaiart',
  chapter: '第六章 · 微縮庭園',
  sourceLabel: 'Suno 原創音樂',
  genre: '微縮音樂盒',
  key: 'A minor',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
