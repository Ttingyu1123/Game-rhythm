import { LANES } from '../../config.js';

const AUDIO_URL = new URL('../../../assets/music/main-theme.mp3', import.meta.url).href;

const BPM = 130;
const BEAT = 60 / BPM;
const BEAT_OFFSET = 0.024;
const DURATION = 76.8;

const BEGINNER_PATTERNS = Object.freeze([
  Object.freeze(['left', 'down', 'up', 'right']),
  Object.freeze(['left', 'up', 'down', 'right']),
  Object.freeze(['down', 'left', 'right', 'up']),
]);

const ADVANCED_PATTERNS = Object.freeze([
  Object.freeze(['left', 'down', 'up', 'right', 'up', 'down', 'left', 'right']),
  Object.freeze(['down', 'left', 'up', 'down', 'right', 'up', 'left', 'right']),
  Object.freeze(['left', 'up', 'right', 'down', 'right', 'up', 'down', 'left']),
]);

const OPPOSITE_LANE = Object.freeze({
  left: 'right',
  down: 'up',
  up: 'down',
  right: 'left',
});

const DIFFICULTIES = Object.freeze([
  Object.freeze({
    id: 'apprentice',
    level: 1,
    label: '入門',
    noteCount: 104,
    description: '四分音符為主 · 無雙押',
    scrollSpeed: 390,
  }),
  Object.freeze({
    id: 'journeyman',
    level: 2,
    label: '學徒',
    noteCount: 146,
    description: '短段八分音符 · 無雙押',
    scrollSpeed: 410,
  }),
  Object.freeze({
    id: 'adept',
    level: 3,
    label: '熟練',
    noteCount: 202,
    description: '八分音符 · 6 組雙押',
    scrollSpeed: 430,
  }),
  Object.freeze({
    id: 'expert',
    level: 4,
    label: '專家',
    noteCount: 264,
    description: '高密度八分音符 · 18 組雙押',
    scrollSpeed: 440,
  }),
]);

function roundedTime(tick) {
  return Number((BEAT_OFFSET + (tick / 2) * BEAT).toFixed(6));
}

function difficultyForLevel(level) {
  const numericLevel = Number(level);
  return DIFFICULTIES.find((difficulty) => difficulty.level === numericLevel) ?? DIFFICULTIES[0];
}

function createMoonlitGearParadeChart(requestedLevel = 1) {
  const difficulty = difficultyForLevel(requestedLevel);
  const events = new Map();
  const holds = new Map();

  const addSingle = (tick, lane) => {
    if (!events.has(tick)) events.set(tick, [lane]);
  };

  // Extends an already-placed note into a sustained hold of lengthBeats.
  const addHold = (beat, lane, lengthBeats) => {
    holds.set(`${beat * 2}:${lane}`, lengthBeats * 2);
  };

  const addDouble = (beat) => {
    const tick = beat * 2;
    const lanes = events.get(tick);
    if (!lanes?.length || lanes.length >= 2) return;
    lanes.push(OPPOSITE_LANE[lanes[0]]);
  };

  const addBeginnerSection = ({ start, end, step = 1, phrase = 0, restEvery = 0 }) => {
    const pattern = BEGINNER_PATTERNS[phrase % BEGINNER_PATTERNS.length];
    for (let beat = start; beat < end; beat += step) {
      const position = Math.round((beat - start) / step);
      if (restEvery > 0 && (position + 1) % restEvery === 0) continue;
      addSingle(beat * 2, pattern[position % pattern.length]);
    }
  };

  const addHalfBeatRange = (start, end, phrase = 0) => {
    const pattern = ADVANCED_PATTERNS[phrase % ADVANCED_PATTERNS.length];
    for (let beat = start; beat < end; beat += 1) {
      const position = beat - start;
      addSingle(beat * 2 + 1, pattern[position % pattern.length]);
    }
  };

  const fillRange = ({ start, end, step, phrase = 0 }) => {
    const pattern = ADVANCED_PATTERNS[phrase % ADVANCED_PATTERNS.length];
    const startTick = start * 2;
    const endTick = end * 2;
    const tickStep = step * 2;
    let position = 0;
    for (let tick = startTick; tick < endTick; tick += tickStep) {
      addSingle(tick, pattern[position % pattern.length]);
      position += 1;
    }
  };

  // Lv.1: predictable quarter-note phrases with regular breathing room.
  addBeginnerSection({ start: 12, end: 28, step: 2, phrase: 0 });
  addBeginnerSection({ start: 28, end: 52, phrase: 0, restEvery: 4 });
  addBeginnerSection({ start: 52, end: 68, phrase: 1, restEvery: 4 });
  addBeginnerSection({ start: 68, end: 82, step: 2, phrase: 0 });
  addBeginnerSection({ start: 82, end: 106, phrase: 2, restEvery: 4 });
  addBeginnerSection({ start: 106, end: 116, step: 2, phrase: 1 });
  addBeginnerSection({ start: 116, end: 132, phrase: 0, restEvery: 4 });
  addBeginnerSection({ start: 132, end: 156, phrase: 1, restEvery: 8 });
  addBeginnerSection({ start: 156, end: 162, step: 2, phrase: 0 });

  // Lv.2: introduce six short off-beat runs without simultaneous notes.
  if (difficulty.level >= 2) {
    [[32, 40], [48, 56], [84, 92], [100, 108], [134, 140], [150, 154]]
      .forEach(([start, end], index) => addHalfBeatRange(start, end, index));
  }

  // Lv.3: complete the three main off-beat sections and add six clear accents.
  if (difficulty.level >= 3) {
    [[32, 64], [82, 112], [132, 162]]
      .forEach(([start, end], index) => addHalfBeatRange(start, end, index + 1));
    [32, 48, 84, 100, 136, 152].forEach(addDouble);
  }

  // Lv.4: restore the original continuous density and eighteen accent doubles.
  if (difficulty.level >= 4) {
    [
      { start: 8, end: 32, step: 1, phrase: 0 },
      { start: 32, end: 64, step: 0.5, phrase: 1 },
      { start: 64, end: 82, step: 1, phrase: 2 },
      { start: 82, end: 112, step: 0.5, phrase: 0 },
      { start: 112, end: 132, step: 1, phrase: 1 },
      { start: 132, end: 162, step: 0.5, phrase: 2 },
    ].forEach(fillRange);
    [16, 24, 32, 40, 48, 56, 64, 72, 84, 92, 100, 108, 116, 124, 136, 144, 152, 160]
      .forEach(addDouble);

    // Expert introduces sustained runes on notes with free lane space after them.
    addHold(9, 'down', 2);
    addHold(15, 'right', 2);
    addHold(20, 'left', 2);
    addHold(28, 'left', 2);
    addHold(34.5, 'up', 1.5);
    addHold(41, 'down', 2);
  }

  const notes = [...events.entries()]
    .flatMap(([tick, lanes]) => lanes.map((lane) => ({ tick, lane })))
    .sort((a, b) => a.tick - b.tick || LANES.indexOf(a.lane) - LANES.indexOf(b.lane))
    .map(({ tick, lane }, index) => {
      const time = roundedTime(tick);
      const base = { id: `gear-l${difficulty.level}-${String(index + 1).padStart(3, '0')}`, time, lane };
      const lengthTicks = holds.get(`${tick}:${lane}`);
      if (lengthTicks) {
        const endTime = Number((BEAT_OFFSET + ((tick + lengthTicks) / 2) * BEAT).toFixed(6));
        return { ...base, type: 'hold', duration: Number((endTime - time).toFixed(6)) };
      }
      return { ...base, type: 'tap' };
    });

  return {
    songId: 'moonlit-gear-parade',
    bpm: BPM,
    duration: DURATION,
    difficulty: difficulty.id,
    level: difficulty.level,
    scrollSpeed: difficulty.scrollSpeed,
    chartOffset: BEAT_OFFSET,
    beatOffset: BEAT_OFFSET,
    notes,
  };
}

export const MOONLIT_GEAR_PARADE = Object.freeze({
  id: 'moonlit-gear-parade',
  title: '月光齒輪巡遊',
  titleEn: 'Moonlit Gear Parade',
  artist: 'tingyusaiart',
  chapter: '第一章 · 發條月祭',
  sourceLabel: '正式原創音樂',
  genre: '奇幻小調',
  key: 'D minor',
  bpm: BPM,
  duration: DURATION,
  audioType: 'file',
  audio: Object.freeze({
    type: 'file',
    url: AUDIO_URL,
  }),
  defaultDifficulty: 1,
  difficulties: DIFFICULTIES,
  createChart: createMoonlitGearParadeChart,
});
