import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_CATALOG } from '../src/data/songCatalog.js';
import { validateChart } from '../src/rhythm/ChartValidator.js';

const EXPECTATIONS = Object.freeze([
  Object.freeze({
    id: 'swing-carnival',
    bpm: 111,
    duration: 69.8,
    beatOffset: 0,
    noteRanges: [[86, 92], [122, 132], [162, 176], [220, 240]],
    doubleCounts: [0, 0, 6, 16],
  }),
  Object.freeze({
    id: 'dancing-on-a-cloud',
    bpm: 127,
    duration: 153.56,
    beatOffset: 0,
    noteRanges: [[160, 180], [220, 245], [305, 335], [405, 440]],
    doubleCounts: [0, 0, 12, 28],
  }),
  Object.freeze({
    id: 'parade-of-paws',
    bpm: 100,
    duration: 94.96,
    beatOffset: 0.021,
    noteRanges: [[110, 122], [158, 175], [225, 245], [300, 325]],
    doubleCounts: [0, 0, 8, 20],
  }),
  Object.freeze({
    id: 'whimsical-cute',
    bpm: 122,
    duration: 112.88,
    beatOffset: 0.416,
    noteRanges: [[140, 150], [190, 205], [280, 295], [335, 350]],
    doubleCounts: [0, 0, 9, 20],
  }),
  Object.freeze({
    id: 'miniature-world',
    bpm: 99.95,
    duration: 104.12,
    beatOffset: 0.016,
    noteRanges: [[110, 120], [158, 168], [214, 225], [295, 308]],
    doubleCounts: [0, 0, 8, 18],
  }),
  Object.freeze({
    id: 'neon-mirage',
    bpm: 110,
    duration: 142.24,
    beatOffset: 0.689,
    noteRanges: [[176, 188], [240, 252], [320, 335], [450, 465]],
    doubleCounts: [0, 0, 10, 24],
  }),
]);

function simultaneousCounts(notes) {
  const counts = new Map();
  for (const note of notes) counts.set(note.time, (counts.get(note.time) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1);
}

function noteKeys(notes) {
  return new Set(notes.map(({ time, lane }) => `${time}|${lane}`));
}

test('new songs expose four progressively denser validated charts', () => {
  for (const expected of EXPECTATIONS) {
    const song = SONG_CATALOG.find(({ id }) => id === expected.id);
    assert.ok(song, `曲庫缺少 ${expected.id}`);
    assert.deepEqual(song.difficulties.map(({ level }) => level), [1, 2, 3, 4]);
    assert.equal(song.defaultDifficulty, 1);

    const charts = song.difficulties.map(({ level }) => song.createChart(level));
    charts.forEach((chart, index) => {
      const difficulty = song.difficulties[index];
      const [minimumNotes, maximumNotes] = expected.noteRanges[index];
      const doubles = simultaneousCounts(chart.notes);

      assert.deepEqual(validateChart(chart), []);
      assert.equal(chart.songId, expected.id);
      assert.equal(chart.difficulty, difficulty.id);
      assert.equal(chart.level, difficulty.level);
      assert.equal(chart.bpm, expected.bpm);
      assert.equal(chart.duration, expected.duration);
      assert.equal(chart.beatOffset, expected.beatOffset);
      assert.equal(chart.notes.length, difficulty.noteCount);
      assert.ok(chart.notes.length >= minimumNotes && chart.notes.length <= maximumNotes);
      assert.equal(doubles.length, expected.doubleCounts[index]);
      assert.ok(doubles.every((count) => count === 2));
      assert.ok(chart.notes.at(-1).time < chart.duration - 1);

      const pulseDuration = (60 / chart.bpm) / 12;
      for (const note of chart.notes) {
        const pulse = (note.time - chart.beatOffset) / pulseDuration;
        assert.ok(Math.abs(pulse - Math.round(pulse)) < 0.00003);
      }
    });

    for (let index = 0; index < charts.length - 1; index += 1) {
      const harderNotes = noteKeys(charts[index + 1].notes);
      for (const note of noteKeys(charts[index].notes)) {
        assert.ok(harderNotes.has(note), `${expected.id} Lv.${index + 1} 音符未保留到下一級`);
      }
    }

    assert.deepEqual(song.createChart(999), song.createChart(1));
    assert.deepEqual(song.createChart(4), song.createChart(4));
  }
});
