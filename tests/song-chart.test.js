import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChart } from '../src/rhythm/ChartValidator.js';
import { MOONLIT_GEAR_PARADE } from '../src/data/songs.js';

const EXPECTATIONS = Object.freeze([
  { level: 1, noteCount: 104, doubleCount: 0, scrollSpeed: 390 },
  { level: 2, noteCount: 146, doubleCount: 0, scrollSpeed: 410 },
  { level: 3, noteCount: 202, doubleCount: 6, scrollSpeed: 430 },
  { level: 4, noteCount: 264, doubleCount: 18, scrollSpeed: 440 },
]);

function simultaneousTimes(notes) {
  const counts = new Map();
  for (const note of notes) counts.set(note.time, (counts.get(note.time) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1);
}

test('Moonlit Gear Parade exposes four progressively denser difficulties', () => {
  assert.deepEqual(
    MOONLIT_GEAR_PARADE.difficulties?.map(({ level }) => level),
    [1, 2, 3, 4],
  );
  assert.equal(MOONLIT_GEAR_PARADE.defaultDifficulty, 1);

  const counts = EXPECTATIONS.map(({ level }) =>
    MOONLIT_GEAR_PARADE.createChart(level).notes.length,
  );
  assert.deepEqual(counts, EXPECTATIONS.map(({ noteCount }) => noteCount));
  assert.ok(counts.every((count, index) => index === 0 || count > counts[index - 1]));
});

test('every bundled difficulty is deterministic, valid, and aligned to the song', () => {
  for (const expected of EXPECTATIONS) {
    const difficulty = MOONLIT_GEAR_PARADE.difficulties.find(({ level }) => level === expected.level);
    const first = MOONLIT_GEAR_PARADE.createChart(expected.level);
    const second = MOONLIT_GEAR_PARADE.createChart(expected.level);

    assert.deepEqual(first, second);
    assert.deepEqual(validateChart(first), []);
    assert.equal(first.songId, 'moonlit-gear-parade');
    assert.equal(first.difficulty, difficulty.id);
    assert.equal(difficulty.noteCount, expected.noteCount);
    assert.equal(first.level, expected.level);
    assert.equal(first.bpm, 130);
    assert.equal(first.duration, 76.8);
    assert.equal(first.beatOffset, 0.024);
    assert.equal(first.scrollSpeed, expected.scrollSpeed);
    assert.equal(first.notes.length, expected.noteCount);
    assert.equal(simultaneousTimes(first.notes).length, expected.doubleCount);
    assert.ok(simultaneousTimes(first.notes).every((count) => count === 2));
    assert.ok(first.notes[first.notes.length - 1].time < first.duration - 1);

    const grid = (expected.level === 1 ? 60 : 30) / first.bpm;
    for (const note of first.notes) {
      const gridPosition = (note.time - first.beatOffset) / grid;
      assert.ok(Math.abs(gridPosition - Math.round(gridPosition)) < 0.00001);
    }
  }
});

test('an unknown difficulty safely falls back to level one', () => {
  assert.deepEqual(
    MOONLIT_GEAR_PARADE.createChart(999),
    MOONLIT_GEAR_PARADE.createChart(),
  );
});
