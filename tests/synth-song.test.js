import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMoonlitSamples } from '../src/audio/SynthSong.js';

test('renders deterministic finite stereo samples at the requested size', () => {
  const options = { sampleRate: 2000, duration: 3, bpm: 128 };
  const first = renderMoonlitSamples(options);
  const second = renderMoonlitSamples(options);

  assert.equal(first.left.length, 6000);
  assert.equal(first.right.length, 6000);
  assert.deepEqual(first.left, second.left);
  assert.deepEqual(first.right, second.right);
  assert.ok(first.left.every(Number.isFinite));
  assert.ok(first.right.every(Number.isFinite));
});

test('produces audible, normalized content without digital clipping', () => {
  const rendered = renderMoonlitSamples({ sampleRate: 4000, duration: 4, bpm: 128 });
  const peak = Math.max(
    ...rendered.left.map(Math.abs),
    ...rendered.right.map(Math.abs),
  );

  assert.ok(peak > 0.1);
  assert.ok(peak <= 0.92);
  assert.notDeepEqual(rendered.left, rendered.right);
});
