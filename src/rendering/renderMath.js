export function noteYAtTime({ hitLineY, noteTime, songTime, pixelsPerSecond }) {
  return hitLineY - (noteTime - songTime) * pixelsPerSecond;
}

export function buildTimingHistogram(offsetsMs, { binMs = 20, rangeMs = 140 } = {}) {
  if (!(binMs > 0) || !(rangeMs > 0)) {
    throw new RangeError('binMs and rangeMs must be positive numbers.');
  }

  const maxIndex = Math.round(rangeMs / binMs);
  const bins = [];
  for (let index = -maxIndex; index <= maxIndex; index += 1) {
    bins.push({ centerMs: index * binMs, count: 0 });
  }

  let total = 0;
  let early = 0;
  let late = 0;
  for (const value of offsetsMs ?? []) {
    if (!Number.isFinite(value)) continue;
    total += 1;
    if (value < 0) early += 1;
    else if (value > 0) late += 1;
    const clamped = Math.max(-rangeMs, Math.min(rangeMs, value));
    const index = Math.max(-maxIndex, Math.min(maxIndex, Math.round(clamped / binMs)));
    bins[index + maxIndex].count += 1;
  }

  const maxCount = bins.reduce((max, bin) => Math.max(max, bin.count), 0);
  return { bins, maxCount, total, early, late, binMs, rangeMs };
}
