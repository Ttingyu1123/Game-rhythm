import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionStats, gradeForAccuracy } from '../src/rhythm/SessionStats.js';

test('updates combo, maximum combo, gauge and judgment counts', () => {
  const stats = new SessionStats(5);

  stats.apply('marvelous', -0.01);
  stats.apply('perfect', 0.02);
  stats.apply('great', 0.04);
  stats.apply('miss');
  stats.apply('good', -0.08);
  const snapshot = stats.snapshot();

  assert.equal(snapshot.combo, 1);
  assert.equal(snapshot.maxCombo, 3);
  assert.equal(snapshot.counts.marvelous, 1);
  assert.equal(snapshot.counts.miss, 1);
  assert.equal(snapshot.gauge, 43.7);
});

test('normalizes score and accuracy against total chart notes', () => {
  const stats = new SessionStats(2);

  stats.apply('marvelous', 0);
  stats.apply('perfect', 0.01);
  const result = stats.finalize();

  assert.equal(result.score, 950000);
  assert.equal(result.accuracy, 97.5);
  assert.equal(result.grade, 'S');
  assert.equal(result.fullCombo, true);
  assert.equal(result.allPerfect, true);
});

test('tracks early, late and average hit offset without counting misses', () => {
  const stats = new SessionStats(3);

  stats.apply('great', -0.06);
  stats.apply('perfect', 0.03);
  stats.apply('miss');
  const result = stats.finalize();

  assert.equal(result.early, 1);
  assert.equal(result.late, 1);
  assert.equal(result.averageOffsetMs, -15);
});

test('miss breaks combo and prevents full combo or all perfect', () => {
  const stats = new SessionStats(2);
  stats.apply('marvelous', 0);
  stats.apply('miss');

  const result = stats.finalize();

  assert.equal(result.combo, 0);
  assert.equal(result.fullCombo, false);
  assert.equal(result.allPerfect, false);
});

test('locks statistics after finalization', () => {
  const stats = new SessionStats(1);
  stats.apply('marvelous', 0);
  const result = stats.finalize();

  stats.apply('miss');

  assert.deepEqual(stats.snapshot(), result);
});

test('maps accuracy to centralized grade thresholds', () => {
  assert.equal(gradeForAccuracy(99.5), 'SSS');
  assert.equal(gradeForAccuracy(98), 'SS');
  assert.equal(gradeForAccuracy(95), 'S');
  assert.equal(gradeForAccuracy(90), 'A');
  assert.equal(gradeForAccuracy(80), 'B');
  assert.equal(gradeForAccuracy(70), 'C');
  assert.equal(gradeForAccuracy(69.99), 'D');
});
