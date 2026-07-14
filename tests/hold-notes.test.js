import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WINDOWS,
  resolvePress,
  resolveHoldRelease,
  resolveAutoMisses,
} from '../src/rhythm/JudgmentSystem.js';

const hold = (id, time, lane, duration) => ({
  id, time, lane, type: 'hold', duration, judged: false, holdActive: false, headJudgment: null,
});

test('pressing a hold head activates it without fully judging it', () => {
  const notes = [hold('h1', 1, 'left', 0.5)];

  const result = resolvePress(notes, 'left', 1);

  assert.equal(result.isHold, true);
  assert.equal(result.phase, 'head');
  assert.equal(result.judgment, 'marvelous');
  assert.equal(notes[0].holdActive, true);
  assert.equal(notes[0].judged, false);
});

test('an active hold cannot be re-pressed by a second key in the same lane', () => {
  const notes = [hold('h1', 1, 'left', 0.5), hold('h2', 1.05, 'left', 0.5)];

  resolvePress(notes, 'left', 1);
  const second = resolvePress(notes, 'left', 1.02);

  assert.equal(second.note.id, 'h2');
  assert.equal(notes[0].holdActive, true);
});

test('releasing near the tail completes the hold, graded by the worse of head and tail', () => {
  const notes = [hold('h1', 1, 'left', 0.5)]; // endTime = 1.5
  resolvePress(notes, 'left', 1.05); // head = perfect (offset +0.05)

  const release = resolveHoldRelease(notes, 'left', 1.5); // tail = marvelous

  assert.equal(release.broken, false);
  assert.equal(release.judgment, 'perfect'); // worse of perfect head / marvelous tail
  assert.equal(notes[0].judged, true);
  assert.equal(notes[0].holdActive, false);
});

test('releasing well before the tail breaks the hold for partial credit', () => {
  const notes = [hold('h1', 1, 'left', 0.5)]; // endTime = 1.5
  resolvePress(notes, 'left', 1);

  const release = resolveHoldRelease(notes, 'left', 1.2); // far before 1.5

  assert.equal(release.broken, true);
  assert.equal(release.judgment, 'good');
  assert.equal(notes[0].judged, true);
});

test('holding past the tail without releasing auto-completes as sustained success', () => {
  const notes = [hold('h1', 1, 'left', 0.5)]; // endTime = 1.5
  resolvePress(notes, 'left', 1); // head marvelous

  const resolved = resolveAutoMisses(notes, 1.5 + DEFAULT_WINDOWS.good + 0.01);

  assert.deepEqual(resolved.map((n) => n.id), ['h1']);
  assert.equal(notes[0].judgment, 'marvelous');
  assert.equal(notes[0].autoCompleted, true);
});

test('a hold whose head is never pressed auto-misses like a tap', () => {
  const notes = [hold('h1', 1, 'left', 0.5)];

  const resolved = resolveAutoMisses(notes, 1 + DEFAULT_WINDOWS.good + 0.01);

  assert.deepEqual(resolved.map((n) => n.id), ['h1']);
  assert.equal(notes[0].judgment, 'miss');
  assert.equal(notes[0].holdActive, false);
});

test('release resolves nothing when no hold is active in the lane', () => {
  const notes = [hold('h1', 1, 'right', 0.5)];
  assert.equal(resolveHoldRelease(notes, 'left', 1.5), null);
});
