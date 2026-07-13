import { LANES } from '../config.js';

const PULSES_PER_BEAT = 12;

const OPPOSITE_LANE = Object.freeze({
  left: 'right',
  down: 'up',
  up: 'down',
  right: 'left',
});

function positiveNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${name} 必須是正數。`);
  }
  return number;
}

function pulseForBeat(beat) {
  const rawPulse = Number(beat) * PULSES_PER_BEAT;
  const pulse = Math.round(rawPulse);
  if (!Number.isFinite(rawPulse) || Math.abs(rawPulse - pulse) > 0.000001) {
    throw new TypeError(`拍點 ${beat} 不在 12-pulse 網格上。`);
  }
  return pulse;
}

function assertLane(lane) {
  if (!LANES.includes(lane)) throw new TypeError(`無效軌道：${lane}`);
}

export function createTapChartSet({
  songId,
  bpm,
  duration,
  beatOffset = 0,
  idPrefix,
  difficulties: difficultyDefinitions,
  build,
}) {
  const safeBpm = positiveNumber(bpm, 'bpm');
  const safeDuration = positiveNumber(duration, 'duration');
  const safeBeatOffset = Number(beatOffset);
  if (!Number.isFinite(safeBeatOffset)) throw new TypeError('beatOffset 必須是有限數字。');
  if (typeof songId !== 'string' || !songId.trim()) throw new TypeError('songId 不可空白。');
  if (typeof idPrefix !== 'string' || !idPrefix.trim()) throw new TypeError('idPrefix 不可空白。');
  if (!Array.isArray(difficultyDefinitions) || !difficultyDefinitions.length) {
    throw new TypeError('至少需要一個難度。');
  }
  if (typeof build !== 'function') throw new TypeError('build 必須是函式。');

  const baseDifficulties = difficultyDefinitions.map((difficulty) => Object.freeze({ ...difficulty }));
  const levels = new Set();
  const ids = new Set();
  for (const difficulty of baseDifficulties) {
    if (!Number.isInteger(difficulty.level) || difficulty.level < 1) {
      throw new TypeError('難度 level 必須是正整數。');
    }
    if (levels.has(difficulty.level)) throw new Error(`難度 level 不可重複：${difficulty.level}`);
    if (ids.has(difficulty.id)) throw new Error(`難度 ID 不可重複：${difficulty.id}`);
    levels.add(difficulty.level);
    ids.add(difficulty.id);
  }

  const beatDuration = 60 / safeBpm;

  const buildNotes = (level) => {
    const events = new Map();

    const addPulse = (pulse, lane) => {
      assertLane(lane);
      const time = safeBeatOffset + (pulse / PULSES_PER_BEAT) * beatDuration;
      if (time < 0 || time >= safeDuration) {
        throw new RangeError(`音符時間超出歌曲範圍：${time.toFixed(6)} 秒。`);
      }
      if (!events.has(pulse)) events.set(pulse, [lane]);
    };

    const addNote = (beat, lane) => addPulse(pulseForBeat(beat), lane);

    const addRange = ({
      start,
      end,
      step,
      pattern,
      patternOffset = 0,
      skipEvery = 0,
    }) => {
      const startPulse = pulseForBeat(start);
      const endPulse = pulseForBeat(end);
      const stepPulse = pulseForBeat(step);
      if (stepPulse <= 0) throw new TypeError('addRange step 必須是正數。');
      if (!Array.isArray(pattern) || !pattern.length) throw new TypeError('addRange 需要軌道 pattern。');
      pattern.forEach(assertLane);

      let position = 0;
      for (let pulse = startPulse; pulse < endPulse; pulse += stepPulse) {
        const shouldSkip = skipEvery > 0 && (position + 1) % skipEvery === 0;
        if (!shouldSkip) {
          const lane = pattern[(position + patternOffset) % pattern.length];
          addPulse(pulse, lane);
        }
        position += 1;
      }
    };

    const addDouble = (beat, requestedLane) => {
      const pulse = pulseForBeat(beat);
      const lanes = events.get(pulse);
      if (!lanes || lanes.length !== 1) return false;
      const secondLane = requestedLane ?? OPPOSITE_LANE[lanes[0]];
      assertLane(secondLane);
      if (secondLane === lanes[0]) throw new TypeError('雙押必須使用不同軌道。');
      lanes.push(secondLane);
      return true;
    };

    build({
      level,
      addNote,
      addRange,
      addDouble,
    });

    return [...events.entries()]
      .flatMap(([pulse, lanes]) => lanes.map((lane) => ({ pulse, lane })))
      .sort((a, b) => a.pulse - b.pulse || LANES.indexOf(a.lane) - LANES.indexOf(b.lane))
      .map(({ pulse, lane }, index) => Object.freeze({
        id: `${idPrefix}-l${level}-${String(index + 1).padStart(3, '0')}`,
        time: Number((safeBeatOffset + (pulse / PULSES_PER_BEAT) * beatDuration).toFixed(6)),
        lane,
        type: 'tap',
      }));
  };

  const templates = new Map(
    baseDifficulties.map((difficulty) => [
      difficulty.level,
      Object.freeze(buildNotes(difficulty.level)),
    ]),
  );

  const difficulties = Object.freeze(baseDifficulties.map((difficulty) => Object.freeze({
    ...difficulty,
    noteCount: templates.get(difficulty.level).length,
  })));

  const createChart = (requestedLevel = difficulties[0].level) => {
    const level = Number(requestedLevel);
    const difficulty = difficulties.find((candidate) => candidate.level === level) ?? difficulties[0];
    return {
      songId,
      bpm: safeBpm,
      duration: safeDuration,
      difficulty: difficulty.id,
      level: difficulty.level,
      scrollSpeed: difficulty.scrollSpeed,
      chartOffset: safeBeatOffset,
      beatOffset: safeBeatOffset,
      notes: templates.get(difficulty.level).map((note) => ({ ...note })),
    };
  };

  return Object.freeze({
    difficulties,
    createChart,
  });
}
