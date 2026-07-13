const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export class AudioTimeline {
  constructor(duration) {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new TypeError('duration must be a positive number.');
    }
    this.duration = duration;
    this.contextStartTime = 0;
    this.offset = 0;
    this.running = false;
  }

  schedule(contextStartTime, offset = this.offset) {
    this.contextStartTime = contextStartTime;
    this.offset = clamp(offset, 0, this.duration);
    this.running = true;
  }

  songTimeAt(contextTime) {
    if (!this.running || contextTime <= this.contextStartTime) return this.offset;
    return clamp(this.offset + contextTime - this.contextStartTime, 0, this.duration);
  }

  secondsUntilStart(contextTime) {
    if (!this.running) return 0;
    return Math.max(0, this.contextStartTime - contextTime);
  }

  pause(contextTime) {
    this.offset = this.songTimeAt(contextTime);
    this.running = false;
    return this.offset;
  }

  reset() {
    this.contextStartTime = 0;
    this.offset = 0;
    this.running = false;
  }
}
