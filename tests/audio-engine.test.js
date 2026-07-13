import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/AudioEngine.js';

class FakeNode {
  constructor() {
    this.connections = [];
  }

  connect(target) {
    this.connections.push(target);
    return target;
  }
}

class FakeSource extends FakeNode {
  start(when, offset) {
    this.startArgs = { when, offset };
  }

  stop() {
    this.stopped = true;
  }
}

class FakeContext {
  constructor() {
    this.currentTime = 5;
    this.sampleRate = 1000;
    this.state = 'suspended';
    this.destination = new FakeNode();
    this.sources = [];
  }

  async resume() {
    this.state = 'running';
  }

  createGain() {
    const node = new FakeNode();
    node.gain = { value: 1 };
    return node;
  }

  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

test('initializes one context after interaction and schedules from its clock', async () => {
  const context = new FakeContext();
  let factoryCalls = 0;
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => {
      factoryCalls += 1;
      return context;
    },
    bufferFactory: () => ({ duration: 60 }),
  });

  const startAt = await engine.schedule(0, 3);
  await engine.ensureReady();

  assert.equal(factoryCalls, 1);
  assert.equal(context.state, 'running');
  assert.equal(startAt, 8);
  assert.deepEqual(context.sources[0].startArgs, { when: 8, offset: 0 });
  context.currentTime = 9.25;
  assert.equal(engine.songTime, 1.25);
});

test('pause and resume recreate a source at the exact saved offset', async () => {
  const context = new FakeContext();
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => ({}),
  });
  await engine.schedule(0, 0);
  context.currentTime = 7.5;

  const offset = engine.pause();
  const resumeAt = await engine.resume(2);

  assert.equal(offset, 2.5);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(context.sources.length, 2);
  assert.deepEqual(context.sources[1].startArgs, { when: 9.5, offset: 2.5 });
  assert.equal(resumeAt, 9.5);
});

test('rescheduling stops the previous source and stop resets the clock', async () => {
  const context = new FakeContext();
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => ({}),
  });
  await engine.schedule(0, 1);
  await engine.schedule(4, 1);

  assert.equal(context.sources[0].stopped, true);
  engine.stop();
  assert.equal(context.sources[1].stopped, true);
  assert.equal(engine.songTime, 0);
});

test('clamps master volume to a safe zero-to-one range', async () => {
  const context = new FakeContext();
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => ({}),
  });
  await engine.ensureReady();

  assert.equal(engine.setVolume(2), 1);
  assert.equal(engine.setVolume(-1), 0);
});

test('configure stops the old song and reuses the audio graph for the new song', async () => {
  const context = new FakeContext();
  const firstBuffer = { id: 'first' };
  const secondBuffer = { id: 'second' };
  let secondFactoryCalls = 0;
  const engine = new AudioEngine({
    duration: 60,
    bpm: 120,
    contextFactory: () => context,
    bufferFactory: () => firstBuffer,
  });
  await engine.schedule(12, 0);
  const oldSource = context.sources[0];

  engine.configure({
    duration: 45,
    bpm: 110,
    bufferFactory: () => {
      secondFactoryCalls += 1;
      return secondBuffer;
    },
  });

  assert.equal(oldSource.stopped, true);
  assert.equal(engine.duration, 45);
  assert.equal(engine.bpm, 110);
  assert.equal(engine.buffer, null);
  assert.equal(engine.songTime, 0);

  await engine.schedule(0, 0);
  assert.equal(secondFactoryCalls, 1);
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].buffer, secondBuffer);
});

test('switching songs while a file loads prevents the stale song from starting', async () => {
  const context = new FakeContext();
  context.state = 'running';
  const firstLoad = deferred();
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => firstLoad.promise,
  });
  const staleSchedule = engine.schedule(0, 0);
  await Promise.resolve();

  const secondBuffer = { id: 'second' };
  engine.configure({
    duration: 30,
    bpm: 90,
    bufferFactory: () => secondBuffer,
  });
  firstLoad.resolve({ id: 'first' });

  await assert.rejects(staleSchedule, { name: 'AbortError' });
  assert.equal(context.sources.length, 0);
  assert.equal(engine.buffer, null);

  await engine.schedule(0, 0);
  assert.equal(context.sources[0].buffer, secondBuffer);
});

test('stop cancels a schedule that is still loading', async () => {
  const context = new FakeContext();
  context.state = 'running';
  const load = deferred();
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => load.promise,
  });
  const pendingSchedule = engine.schedule(0, 0);
  await Promise.resolve();

  engine.stop();
  load.resolve({ id: 'late-buffer' });

  await assert.rejects(pendingSchedule, { name: 'AbortError' });
  assert.equal(context.sources.length, 0);
});

test('concurrent readiness checks share one buffer load and a failed load can retry', async () => {
  const context = new FakeContext();
  context.state = 'running';
  const load = deferred();
  let calls = 0;
  const engine = new AudioEngine({
    duration: 60,
    contextFactory: () => context,
    bufferFactory: () => {
      calls += 1;
      return calls === 1 ? load.promise : { id: 'retry' };
    },
  });

  const first = engine.ensureReady();
  const second = engine.ensureReady();
  await Promise.resolve();
  assert.equal(calls, 1);
  load.reject(new Error('decode failed'));
  await assert.rejects(first, /decode failed/);
  await assert.rejects(second, /decode failed/);

  await engine.ensureReady();
  assert.equal(calls, 2);
  assert.equal(engine.buffer.id, 'retry');
});

test('configure validates before disturbing the current playback', async () => {
  const context = new FakeContext();
  const engine = new AudioEngine({
    duration: 60,
    bpm: 120,
    contextFactory: () => context,
    bufferFactory: () => ({}),
  });
  await engine.schedule(0, 0);
  const source = context.sources[0];

  assert.throws(
    () => engine.configure({ duration: 0, bpm: 100, bufferFactory: () => ({}) }),
    /duration/,
  );
  assert.equal(source.stopped, undefined);
  assert.equal(engine.duration, 60);
});
