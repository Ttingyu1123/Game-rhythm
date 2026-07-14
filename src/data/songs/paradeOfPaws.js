import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Parade_of_Paws.mp3', import.meta.url).href;

const BPM = 100;
const DURATION = 94.96;
const BEAT_OFFSET = 0.021;

const PAW_PATTERN = Object.freeze(['left', 'right', 'down', 'up', 'left', 'right', 'up', 'down']);
const BOUNCE_PATTERN = Object.freeze(['down', 'left', 'up', 'right', 'down', 'right', 'up', 'left']);
const SCAMPER_PATTERN = Object.freeze(['left', 'down', 'right', 'up']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '規律腳印與休息 · 無雙押', scrollSpeed: 375 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '短段跳步 · 無雙押', scrollSpeed: 395 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '交錯腳步 · 8 組雙押', scrollSpeed: 415 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '奔跑短句 · 20 組雙押', scrollSpeed: 435 }),
]);

const chartSet = createTapChartSet({
  songId: 'parade-of-paws',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'paws',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble, addHold }) {
    addRange({ start: 8, end: 152, step: 1, pattern: PAW_PATTERN, skipEvery: 4 });
    addNote(152, 'left');
    addNote(154, 'right');
    addNote(156, 'up');

    if (level >= 2) {
      [[24, 40], [56, 72], [104, 120]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: BOUNCE_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      [[40, 56], [72, 96], [120, 144]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: BOUNCE_PATTERN, patternOffset: index + 2 });
      });
      [16, 24, 40, 56, 72, 88, 104, 120].forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      addRange({ start: 8.5, end: 152, step: 1, pattern: BOUNCE_PATTERN });
      [[32, 48], [96, 112]].forEach(([start, end], index) => {
        addRange({ start: start + 0.25, end, step: 1, pattern: SCAMPER_PATTERN, patternOffset: index });
      });
      [16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 140, 144, 148, 152]
        .forEach((beat) => addDouble(beat));

      // Expert introduces sustained runes on notes with free lane space after them.
      addHold(8, 'left', 1);
      addHold(12, 'left', 2);
      addHold(16.5, 'down', 1);
      addHold(19.5, 'right', 1);
      addHold(22.5, 'up', 2);
      addHold(26, 'down', 2);
    }
  },
});

export const PARADE_OF_PAWS = Object.freeze({
  id: 'parade-of-paws',
  title: '爪爪大遊行',
  titleEn: 'Parade of Paws',
  artist: 'tingyusaiart',
  chapter: '第四章 · 獸靈巡遊',
  sourceLabel: 'Suno 原創音樂',
  genre: '奇幻進行曲',
  key: 'C major',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
