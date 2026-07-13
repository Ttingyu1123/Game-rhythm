import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager, laneForCode } from '../src/input/InputManager.js';

test('maps arrow keys and D/F/J/K to the same four lanes', () => {
  assert.equal(laneForCode('ArrowLeft'), 'left');
  assert.equal(laneForCode('ArrowDown'), 'down');
  assert.equal(laneForCode('ArrowUp'), 'up');
  assert.equal(laneForCode('ArrowRight'), 'right');
  assert.equal(laneForCode('KeyD'), 'left');
  assert.equal(laneForCode('KeyF'), 'down');
  assert.equal(laneForCode('KeyJ'), 'up');
  assert.equal(laneForCode('KeyK'), 'right');
  assert.equal(laneForCode('Space'), null);
});

test('interactive controls keep keyboard input instead of triggering global shortcuts', () => {
  const calls = { confirm: 0, lane: 0, restart: 0, pause: 0 };
  const manager = new InputManager({
    onLanePress: () => { calls.lane += 1; },
    onLaneRelease: () => {},
    onPause: () => { calls.pause += 1; },
    onRestart: () => { calls.restart += 1; },
    onConfirm: () => { calls.confirm += 1; },
  });
  const interactiveTarget = { closest: () => ({ tagName: 'BUTTON' }) };

  for (const code of ['Space', 'Enter', 'ArrowLeft', 'KeyR']) {
    manager.handleKeyDown({
      code,
      repeat: false,
      target: interactiveTarget,
      preventDefault() {},
    });
  }

  assert.deepEqual(calls, { confirm: 0, lane: 0, restart: 0, pause: 0 });

  let prevented = false;
  manager.handleKeyDown({
    code: 'Space',
    repeat: false,
    target: { closest: () => null },
    preventDefault: () => { prevented = true; },
  });
  assert.equal(calls.confirm, 1);
  assert.equal(prevented, true);
});
