import test from 'node:test';
import assert from 'node:assert/strict';
import { offsetsFromTaps, summarizeCalibration } from '../src/rhythm/LatencyCalibration.js';

const clicks = (count, interval = 0.6, start = 1) =>
  Array.from({ length: count }, (_, i) => start + i * interval);

test('pairs each tap with its nearest click and skips the warm-up bar', () => {
  const clickTimes = clicks(12);
  // Warm-up: taps at clicks 0-3 must be ignored even when perfectly timed.
  const tapTimes = clickTimes.map((t) => t + 0.04);

  const offsets = offsetsFromTaps(clickTimes, tapTimes);
  assert.equal(offsets.length, 8);
  offsets.forEach((offset) => assert.ok(Math.abs(offset - 0.04) < 1e-9));
});

test('discards stray taps that are far from every click', () => {
  const clickTimes = clicks(12);
  const tapTimes = [
    ...clickTimes.slice(4).map((t) => t + 0.03),
    clickTimes[7] + 0.3, // a fumbled press mid-gap
  ];

  const offsets = offsetsFromTaps(clickTimes, tapTimes);
  assert.equal(offsets.length, 8);
});

test('summarize reports the median and rounds to the slider step', () => {
  // Constant +43ms lateness with one early outlier the median shrugs off.
  const offsets = [...Array(9).fill(0.043), -0.15];
  const summary = summarizeCalibration(offsets);

  assert.equal(summary.ok, true);
  assert.equal(summary.sampleCount, 10);
  assert.equal(summary.medianMs, 43);
  assert.equal(summary.suggestedOffsetMs, 45);
});

test('summarize refuses too few samples', () => {
  const summary = summarizeCalibration([0.02, 0.03, 0.02]);
  assert.equal(summary.ok, false);
  assert.equal(summary.reason, 'not-enough-taps');
  assert.equal(summary.sampleCount, 3);
});

test('summarize refuses scattered taps instead of averaging noise', () => {
  const offsets = [-0.12, 0.14, -0.09, 0.11, -0.13, 0.1, -0.08, 0.12];
  const summary = summarizeCalibration(offsets);
  assert.equal(summary.ok, false);
  assert.equal(summary.reason, 'too-scattered');
  assert.ok(summary.spreadMs > 60);
});

test('suggestion is clamped to the slider range', () => {
  const summary = summarizeCalibration(Array(10).fill(0.19));
  assert.equal(summary.ok, true);
  assert.equal(summary.suggestedOffsetMs, 120);

  const negative = summarizeCalibration(Array(10).fill(-0.19));
  assert.equal(negative.suggestedOffsetMs, -120);
});

test('zero-latency taps suggest zero adjustment', () => {
  const summary = summarizeCalibration(Array(12).fill(0));
  assert.equal(summary.ok, true);
  assert.equal(summary.suggestedOffsetMs, 0);
  assert.equal(summary.spreadMs, 0);
});
