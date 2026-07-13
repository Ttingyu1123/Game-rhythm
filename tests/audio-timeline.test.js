import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioTimeline } from '../src/audio/AudioTimeline.js';

test('uses a scheduled context start as the song clock origin', () => {
  const timeline = new AudioTimeline(60);
  timeline.schedule(10, 0);

  assert.equal(timeline.songTimeAt(9.5), 0);
  assert.equal(timeline.songTimeAt(10), 0);
  assert.equal(timeline.songTimeAt(11.25), 1.25);
});

test('freezes at an exact offset when paused', () => {
  const timeline = new AudioTimeline(60);
  timeline.schedule(10, 4);

  const offset = timeline.pause(12.5);

  assert.equal(offset, 6.5);
  assert.equal(timeline.songTimeAt(99), 6.5);
  assert.equal(timeline.running, false);
});

test('resumes from the saved offset without counting the countdown', () => {
  const timeline = new AudioTimeline(60);
  timeline.schedule(10, 0);
  timeline.pause(12);
  timeline.schedule(20, timeline.offset);

  assert.equal(timeline.songTimeAt(19), 2);
  assert.equal(timeline.songTimeAt(21.5), 3.5);
});

test('clamps song time to the playable duration', () => {
  const timeline = new AudioTimeline(5);
  timeline.schedule(1, 4);

  assert.equal(timeline.songTimeAt(99), 5);
  assert.equal(timeline.pause(99), 5);
});

test('reports countdown time from the same context clock', () => {
  const timeline = new AudioTimeline(60);
  timeline.schedule(8, 0);

  assert.equal(timeline.secondsUntilStart(5.25), 2.75);
  assert.equal(timeline.secondsUntilStart(9), 0);
});
