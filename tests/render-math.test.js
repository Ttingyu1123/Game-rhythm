import test from 'node:test';
import assert from 'node:assert/strict';
import { noteYAtTime, buildTimingHistogram } from '../src/rendering/renderMath.js';

test('positions a note above the hit line before its time and on it at time', () => {
  const base = { hitLineY: 600, songTime: 1, pixelsPerSecond: 400 };
  assert.equal(noteYAtTime({ ...base, noteTime: 1 }), 600);
  assert.equal(noteYAtTime({ ...base, noteTime: 1.5 }), 400);
});

test('buckets offsets into symmetric bins centered on zero', () => {
  const histogram = buildTimingHistogram([-60, -55, 0, 30, 140], { binMs: 20, rangeMs: 140 });

  assert.equal(histogram.bins.length, 15);
  assert.equal(histogram.bins[0].centerMs, -140);
  assert.equal(histogram.bins[14].centerMs, 140);
  const centerBin = histogram.bins.find((bin) => bin.centerMs === 0);
  assert.equal(centerBin.count, 1);
  assert.equal(histogram.total, 5);
  assert.equal(histogram.early, 2);
  assert.equal(histogram.late, 2);
  assert.equal(histogram.maxCount, 2);
});

test('rounds each offset to its nearest bin center', () => {
  const histogram = buildTimingHistogram([-58, -62], { binMs: 20, rangeMs: 140 });
  const bin = histogram.bins.find((entry) => entry.centerMs === -60);
  assert.equal(bin.count, 2);
});

test('clamps out-of-range offsets into the edge bins', () => {
  const histogram = buildTimingHistogram([500, -500], { binMs: 20, rangeMs: 140 });
  assert.equal(histogram.bins[14].count, 1);
  assert.equal(histogram.bins[0].count, 1);
  assert.equal(histogram.total, 2);
});

test('ignores non-finite offsets and tolerates an empty set', () => {
  const histogram = buildTimingHistogram([NaN, Infinity], { binMs: 20, rangeMs: 140 });
  assert.equal(histogram.total, 0);
  assert.equal(histogram.maxCount, 0);
  assert.equal(buildTimingHistogram(undefined).total, 0);
});

test('rejects non-positive bin or range', () => {
  assert.throws(() => buildTimingHistogram([], { binMs: 0 }), RangeError);
  assert.throws(() => buildTimingHistogram([], { rangeMs: -1 }), RangeError);
});
