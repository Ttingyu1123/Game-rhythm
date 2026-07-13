import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WINDOWS,
  classifyOffset,
  resolvePress,
  resolveAutoMisses,
} from '../src/rhythm/JudgmentSystem.js';

const note = (id, time, lane) => ({ id, time, lane, type: 'tap', judged: false });

test('selects the closest valid note in the requested lane', () => {
  const notes = [note('older', 0.94, 'left'), note('closest', 1.04, 'left')];

  const result = resolvePress(notes, 'left', 1.03);

  assert.equal(result.note.id, 'closest');
  assert.equal(result.judgment, 'marvelous');
  assert.equal(notes[0].judged, false);
  assert.equal(notes[1].judged, true);
});

test('classifies each judgment boundary inclusively', () => {
  assert.equal(classifyOffset(0.03), 'marvelous');
  assert.equal(classifyOffset(-0.055), 'perfect');
  assert.equal(classifyOffset(0.09), 'great');
  assert.equal(classifyOffset(-0.14), 'good');
  assert.equal(classifyOffset(0.141), null);
});

test('records negative offsets as early and positive offsets as late', () => {
  const early = resolvePress([note('early', 1, 'down')], 'down', 0.95);
  const late = resolvePress([note('late', 1, 'up')], 'up', 1.05);

  assert.equal(early.timing, 'early');
  assert.ok(early.offset < 0);
  assert.equal(late.timing, 'late');
  assert.ok(late.offset > 0);
});

test('keeps simultaneous notes in other lanes available', () => {
  const notes = [note('left', 1, 'left'), note('right', 1, 'right')];

  const left = resolvePress(notes, 'left', 1);

  assert.equal(left.note.id, 'left');
  assert.equal(notes[0].judged, true);
  assert.equal(notes[1].judged, false);

  const right = resolvePress(notes, 'right', 1.01);
  assert.equal(right.note.id, 'right');
});

test('one press resolves at most one same-lane note', () => {
  const notes = [note('one', 1, 'left'), note('two', 1.05, 'left')];

  resolvePress(notes, 'left', 1.02);

  assert.equal(notes.filter((item) => item.judged).length, 1);
});

test('ignores repeated presses after a note has been judged', () => {
  const notes = [note('only', 1, 'left')];

  assert.ok(resolvePress(notes, 'left', 1));
  assert.equal(resolvePress(notes, 'left', 1), null);
});

test('automatically misses only notes that passed the maximum window', () => {
  const notes = [note('expired', 1, 'left'), note('live', 1.2, 'down')];

  const missed = resolveAutoMisses(notes, 1 + DEFAULT_WINDOWS.good + 0.001);

  assert.deepEqual(missed.map((item) => item.id), ['expired']);
  assert.equal(notes[0].judgment, 'miss');
  assert.equal(notes[1].judged, false);
});
