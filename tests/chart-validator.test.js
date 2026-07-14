import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChart } from '../src/rhythm/ChartValidator.js';

const validChart = () => ({
  duration: 10,
  notes: [
    { id: 'n-1', time: 1, lane: 'left', type: 'tap' },
    { id: 'n-2', time: 1, lane: 'right', type: 'tap' },
    { id: 'n-3', time: 2, lane: 'down', type: 'tap' },
  ],
});

test('accepts a sorted chart with an intentional double note', () => {
  assert.deepEqual(validateChart(validChart()), []);
});

test('rejects duplicate ids and duplicate lane-time pairs', () => {
  const chart = validChart();
  chart.notes[1] = { id: 'n-1', time: 1, lane: 'left', type: 'tap' };

  const errors = validateChart(chart).join(' | ');

  assert.match(errors, /duplicate id/i);
  assert.match(errors, /duplicate lane\/time/i);
});

test('rejects invalid lanes and unsupported note types', () => {
  const chart = validChart();
  chart.notes[0].lane = 'center';
  chart.notes[1].type = 'swipe';

  const errors = validateChart(chart).join(' | ');

  assert.match(errors, /invalid lane/i);
  assert.match(errors, /unsupported type/i);
});

test('accepts a hold note with a positive in-range duration', () => {
  const chart = validChart();
  chart.notes[2] = { id: 'n-3', time: 2, lane: 'down', type: 'hold', duration: 1.5 };

  assert.deepEqual(validateChart(chart), []);
});

test('rejects a hold without a positive duration or one that runs past the song', () => {
  const chart = validChart();
  chart.notes = [
    { id: 'bad', time: 1, lane: 'left', type: 'hold', duration: 0 },
    { id: 'long', time: 9, lane: 'right', type: 'hold', duration: 5 },
  ];

  const errors = validateChart(chart).join(' | ');

  assert.match(errors, /positive duration/i);
  assert.match(errors, /beyond song duration/i);
});

test('rejects a note that falls inside a hold in the same lane', () => {
  const chart = validChart();
  chart.notes = [
    { id: 'hold', time: 1, lane: 'left', type: 'hold', duration: 1 },
    { id: 'inside', time: 1.5, lane: 'left', type: 'tap' },
  ];

  assert.match(validateChart(chart).join(' | '), /overlaps another note/i);
});

test('rejects negative, out-of-range, and unsorted note times', () => {
  const chart = validChart();
  chart.notes = [
    { id: 'late', time: 11, lane: 'left', type: 'tap' },
    { id: 'negative', time: -1, lane: 'right', type: 'tap' },
  ];

  const errors = validateChart(chart).join(' | ');

  assert.match(errors, /outside song duration/i);
  assert.match(errors, /negative time/i);
  assert.match(errors, /sorted/i);
});

test('reports malformed chart containers without throwing', () => {
  assert.match(validateChart(null).join(' | '), /chart must be an object/i);
  assert.match(validateChart({ duration: 10 }).join(' | '), /notes must be an array/i);
});
