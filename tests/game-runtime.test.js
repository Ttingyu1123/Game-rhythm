import test from 'node:test';
import assert from 'node:assert/strict';
import { noteYAtTime } from '../src/rendering/renderMath.js';
import { GameStateMachine } from '../src/core/GameState.js';

test('derives note position from absolute song time instead of frame movement', () => {
  assert.equal(noteYAtTime({ hitLineY: 600, noteTime: 2, songTime: 2, pixelsPerSecond: 400 }), 600);
  assert.equal(noteYAtTime({ hitLineY: 600, noteTime: 3, songTime: 2, pixelsPerSecond: 400 }), 200);
  assert.equal(noteYAtTime({ hitLineY: 600, noteTime: 1.5, songTime: 2, pixelsPerSecond: 400 }), 800);
});

test('scroll multiplier changes only visual distance', () => {
  const normal = noteYAtTime({ hitLineY: 600, noteTime: 3, songTime: 2, pixelsPerSecond: 400 });
  const fast = noteYAtTime({ hitLineY: 600, noteTime: 3, songTime: 2, pixelsPerSecond: 600 });

  assert.equal(normal, 200);
  assert.equal(fast, 0);
});

test('allows the intended menu-to-result runtime path', () => {
  const state = new GameStateMachine();

  assert.equal(state.current, 'menu');
  state.transition('loading');
  state.transition('countdown');
  state.transition('playing');
  state.transition('paused');
  state.transition('countdown');
  state.transition('playing');
  state.transition('result');
  state.transition('menu');

  assert.equal(state.current, 'menu');
});

test('rejects invalid transitions that could leak gameplay into menus', () => {
  const state = new GameStateMachine();

  assert.throws(() => state.transition('paused'), /invalid game state transition/i);
  assert.equal(state.current, 'menu');
});
