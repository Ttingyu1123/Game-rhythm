import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChart } from '../src/rhythm/ChartValidator.js';
import { createTapChartSet } from '../src/rhythm/TapChartFactory.js';

const DIFFICULTIES = Object.freeze([
  Object.freeze({
    id: 'apprentice',
    level: 1,
    label: '入門',
    description: '基礎節拍',
    scrollSpeed: 380,
  }),
  Object.freeze({
    id: 'journeyman',
    level: 2,
    label: '學徒',
    description: '加入切分',
    scrollSpeed: 400,
  }),
]);

function createSampleSet() {
  return createTapChartSet({
    songId: 'factory-sample',
    bpm: 120,
    duration: 8,
    beatOffset: 0.1,
    idPrefix: 'sample',
    difficulties: DIFFICULTIES,
    build({ level, addNote, addRange, addDouble }) {
      addRange({
        start: 1,
        end: 5,
        step: 1,
        pattern: ['left', 'down', 'up', 'right'],
      });
      addRange({
        start: 1,
        end: 5,
        step: 1,
        pattern: ['right', 'up', 'down', 'left'],
      });
      addNote(5, 'left');

      if (level >= 2) {
        addRange({
          start: 1.5,
          end: 5.5,
          step: 1,
          pattern: ['right', 'up'],
        });
        addDouble(2);
      }
    },
  });
}

test('derives difficulty note counts while de-duplicating overlapping ranges', () => {
  const chartSet = createSampleSet();

  assert.deepEqual(chartSet.difficulties.map(({ noteCount }) => noteCount), [5, 10]);
  assert.equal(chartSet.createChart(1).notes.length, 5);
  assert.equal(chartSet.createChart(2).notes.length, 10);
  assert.equal(Object.isFrozen(chartSet.difficulties), true);
});

test('creates deterministic independent charts with one explicit double', () => {
  const chartSet = createSampleSet();
  const first = chartSet.createChart(2);
  const second = chartSet.createChart(2);

  assert.deepEqual(first, second);
  assert.deepEqual(validateChart(first), []);
  assert.equal(first.songId, 'factory-sample');
  assert.equal(first.difficulty, 'journeyman');
  assert.equal(first.level, 2);
  assert.equal(first.bpm, 120);
  assert.equal(first.duration, 8);
  assert.equal(first.beatOffset, 0.1);
  assert.equal(first.scrollSpeed, 400);
  assert.match(first.notes[0].id, /^sample-l2-/);

  const timeCounts = new Map();
  for (const note of first.notes) {
    timeCounts.set(note.time, (timeCounts.get(note.time) ?? 0) + 1);
    const pulse = (note.time - first.beatOffset) / ((60 / first.bpm) / 12);
    assert.ok(Math.abs(pulse - Math.round(pulse)) < 0.00002);
  }
  assert.deepEqual([...timeCounts.values()].filter((count) => count > 1), [2]);

  first.notes[0].judged = true;
  assert.equal(second.notes[0].judged, undefined);
});

test('falls back to level one for an unknown difficulty', () => {
  const chartSet = createSampleSet();

  assert.deepEqual(chartSet.createChart(999), chartSet.createChart(1));
});

test('rejects invalid recipe notes before exposing a chart set', () => {
  assert.throws(
    () => createTapChartSet({
      songId: 'invalid-sample',
      bpm: 120,
      duration: 4,
      beatOffset: 0,
      idPrefix: 'invalid',
      difficulties: DIFFICULTIES,
      build({ addNote }) {
        addNote(1, 'center');
      },
    }),
    /無效軌道：center/,
  );
});
