import { createTapChartSet } from '../../rhythm/TapChartFactory.js';

const AUDIO_URL = new URL('../../../assets/music/Dancing_on_a_Cloud.mp3', import.meta.url).href;

const BPM = 127;
const DURATION = 153.56;
const BEAT_OFFSET = 0;

const BASE_PATTERN = Object.freeze(['left', 'down', 'up', 'right', 'up', 'down', 'left', 'right']);
const FLOW_PATTERN = Object.freeze(['left', 'down', 'up', 'right', 'up', 'down']);
const SPARKLE_PATTERN = Object.freeze(['up', 'left', 'right', 'down', 'right', 'left']);

const DIFFICULTY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'apprentice', level: 1, label: '入門', description: '舒展長拍與留白 · 無雙押', scrollSpeed: 385 }),
  Object.freeze({ id: 'journeyman', level: 2, label: '學徒', description: '流動四分音符 · 無雙押', scrollSpeed: 405 }),
  Object.freeze({ id: 'adept', level: 3, label: '熟練', description: '雲端八分音符 · 12 組雙押', scrollSpeed: 425 }),
  Object.freeze({ id: 'expert', level: 4, label: '專家', description: '星光短填充 · 28 組雙押', scrollSpeed: 440 }),
]);

const chartSet = createTapChartSet({
  songId: 'dancing-on-a-cloud',
  bpm: BPM,
  duration: DURATION,
  beatOffset: BEAT_OFFSET,
  idPrefix: 'cloud',
  difficulties: DIFFICULTY_DEFINITIONS,
  build({ level, addNote, addRange, addDouble }) {
    addRange({ start: 8, end: 316, step: 2, pattern: BASE_PATTERN });
    addRange({ start: 8, end: 36, step: 1, pattern: FLOW_PATTERN });
    addNote(318, 'up');

    if (level >= 2) {
      [[68, 100], [132, 164], [196, 228], [260, 292]].forEach(([start, end], index) => {
        addRange({ start, end, step: 1, pattern: FLOW_PATTERN, patternOffset: index });
      });
    }

    if (level >= 3) {
      [[36, 68], [100, 132], [228, 252]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: SPARKLE_PATTERN, patternOffset: index });
      });
      [36, 52, 68, 84, 100, 132, 148, 196, 212, 228, 260, 292]
        .forEach((beat) => addDouble(beat));
    }

    if (level >= 4) {
      [[164, 196], [252, 284]].forEach(([start, end], index) => {
        addRange({ start: start + 0.5, end, step: 1, pattern: SPARKLE_PATTERN, patternOffset: index + 2 });
      });
      addRange({ start: 276.25, end: 292, step: 1, pattern: FLOW_PATTERN });
      [
        20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 116, 124, 132,
        140, 148, 156, 172, 188, 196, 204, 212, 220, 228, 244, 260, 276, 292,
      ].forEach((beat) => addDouble(beat));
    }
  },
});

export const DANCING_ON_A_CLOUD = Object.freeze({
  id: 'dancing-on-a-cloud',
  title: '雲端漫舞',
  titleEn: 'Dancing on a Cloud',
  artist: 'tingyusaiart',
  chapter: '第三章 · 浮空舞會',
  sourceLabel: 'Suno 原創音樂',
  genre: '夢幻舞曲',
  key: 'A minor',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({ type: 'file', url: AUDIO_URL }),
  defaultDifficulty: 1,
  difficulties: chartSet.difficulties,
  createChart: chartSet.createChart,
});
