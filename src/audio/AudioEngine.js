import { AudioTimeline } from './AudioTimeline.js';
import { createMoonlitBuffer } from './SynthSong.js';

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const abortError = () => {
  const error = new Error('音訊操作已取消。');
  error.name = 'AbortError';
  return error;
};

function defaultContextFactory() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error('此瀏覽器不支援 Web Audio API。');
  return new AudioContextClass();
}

export class AudioEngine {
  constructor({
    duration,
    bpm = 128,
    volume = 0.8,
    contextFactory = defaultContextFactory,
    bufferFactory = (context) => createMoonlitBuffer(context, { duration, bpm }),
  }) {
    this.duration = duration;
    this.bpm = bpm;
    this.volume = clamp01(volume);
    this.contextFactory = contextFactory;
    this.bufferFactory = bufferFactory;
    this.timeline = new AudioTimeline(duration);
    this.context = null;
    this.buffer = null;
    this.bufferPromise = null;
    this.source = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.configurationRevision = 0;
    this.playbackRevision = 0;
  }

  ensureContext() {
    if (!this.context) {
      this.context = this.contextFactory();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.musicGain.gain.value = 0.86;
      this.sfxGain.gain.value = 0.72;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
    }
    return this.context;
  }

  // iOS Safari only unlocks an AudioContext that is created and resumed inside the
  // user-gesture task itself. A context born after an await or requestAnimationFrame
  // stays suspended forever: currentTime never advances, so the countdown freezes at 3
  // and nothing plays. Call this synchronously from the click/key handler, before any
  // await, and never await it here — awaiting would defeat the purpose.
  unlock() {
    const context = this.ensureContext();
    if (context.state === 'suspended') {
      const resuming = context.resume();
      if (resuming && typeof resuming.catch === 'function') resuming.catch(() => {});
    }
    return context;
  }

  async ensureReady() {
    this.ensureContext();
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.buffer) return this.context;

    const configurationRevision = this.configurationRevision;
    let bufferPromise = this.bufferPromise;
    if (!bufferPromise) {
      bufferPromise = Promise.resolve().then(() => this.bufferFactory(this.context));
      this.bufferPromise = bufferPromise;
    }

    try {
      const buffer = await bufferPromise;
      if (configurationRevision !== this.configurationRevision) throw abortError();
      this.buffer = buffer;
    } finally {
      if (this.bufferPromise === bufferPromise) this.bufferPromise = null;
    }
    return this.context;
  }

  async schedule(offset = 0, countdownSeconds = 3) {
    const configurationRevision = this.configurationRevision;
    const playbackRevision = ++this.playbackRevision;
    const context = await this.ensureReady();
    if (
      configurationRevision !== this.configurationRevision
      || playbackRevision !== this.playbackRevision
    ) {
      throw abortError();
    }
    this.stopSource();

    const safeOffset = Math.min(this.duration, Math.max(0, offset));
    const startAt = context.currentTime + Math.max(0, countdownSeconds);
    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.musicGain);
    source.start(startAt, safeOffset);
    this.source = source;
    this.timeline.schedule(startAt, safeOffset);
    return startAt;
  }

  pause() {
    if (!this.context) return this.timeline.offset;
    const offset = this.timeline.pause(this.context.currentTime);
    this.playbackRevision += 1;
    this.stopSource();
    return offset;
  }

  async resume(countdownSeconds = 3) {
    return this.schedule(this.timeline.offset, countdownSeconds);
  }

  stop() {
    this.playbackRevision += 1;
    this.stopSource();
    this.timeline.reset();
  }

  configure({ duration, bpm, bufferFactory }) {
    const nextDuration = Number(duration);
    const nextBpm = Number(bpm);
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      throw new TypeError('AudioEngine duration 必須是正數。');
    }
    if (!Number.isFinite(nextBpm) || nextBpm <= 0) {
      throw new TypeError('AudioEngine bpm 必須是正數。');
    }
    if (typeof bufferFactory !== 'function') {
      throw new TypeError('AudioEngine bufferFactory 必須是函式。');
    }

    this.configurationRevision += 1;
    this.playbackRevision += 1;
    this.stopSource();
    this.duration = nextDuration;
    this.bpm = nextBpm;
    this.bufferFactory = bufferFactory;
    this.buffer = null;
    this.bufferPromise = null;
    this.timeline = new AudioTimeline(nextDuration);
    return this;
  }

  stopSource() {
    if (!this.source) return;
    try {
      this.source.stop();
    } catch {
      // A source that already ended is safe to discard.
    }
    this.source.onended = null;
    this.source = null;
  }

  setVolume(value) {
    this.volume = clamp01(value);
    if (this.masterGain) this.masterGain.gain.value = this.volume;
    return this.volume;
  }

  // Schedules metronome ticks for the latency wizard on the sfx chain and returns
  // their exact context-clock times; taps are compared against these on the SAME
  // clock, so output latency shows up in the measurement — which is the point.
  // Caller must have unlocked the context inside a user gesture first.
  scheduleCalibrationTicks({ count = 20, interval = 0.6, leadIn = 1.2, accentEvery = 4 } = {}) {
    const context = this.ensureContext();
    const start = context.currentTime + Math.max(0.05, leadIn);
    const times = [];
    const oscillators = [];
    for (let index = 0; index < count; index += 1) {
      const at = start + index * interval;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(index % accentEvery === 0 ? 1567.98 : 1046.5, at);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(0.2, at + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      oscillator.connect(envelope);
      envelope.connect(this.sfxGain);
      oscillator.start(at);
      oscillator.stop(at + 0.06);
      times.push(at);
      oscillators.push(oscillator);
    }
    return {
      times,
      cancel: () => {
        for (const oscillator of oscillators) {
          try {
            oscillator.stop();
          } catch {
            // Already finished ticks are safe to ignore.
          }
        }
      },
    };
  }

  get clockTime() {
    return this.context ? this.context.currentTime : 0;
  }

  playHit(judgment) {
    if (!this.context || !this.sfxGain || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const frequencies = { marvelous: 1046.5, perfect: 880, great: 659.25, good: 523.25 };
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = judgment === 'marvelous' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequencies[judgment] ?? 392, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.13, now + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    oscillator.connect(envelope);
    envelope.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + 0.075);
  }

  get songTime() {
    return this.context ? this.timeline.songTimeAt(this.context.currentTime) : this.timeline.offset;
  }

  get countdownRemaining() {
    return this.context ? this.timeline.secondsUntilStart(this.context.currentTime) : 0;
  }

  get hasStarted() {
    return Boolean(this.context && this.timeline.running && this.context.currentTime >= this.timeline.contextStartTime);
  }
}
