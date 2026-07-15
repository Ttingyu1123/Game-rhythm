// Pure math for the latency-calibration wizard: no DOM, no audio, Node-testable.
// The player taps along with scheduled metronome clicks; both sides are read from the
// same AudioContext clock, so the median tap offset IS the end-to-end latency
// (audio output + human + input) the judgment clock should be shifted by.

const DEFAULT_PAIRING = Object.freeze({
  // Taps farther than this from every click are stray presses, not rhythm.
  maxDeviationSeconds: 0.2,
  // The first bar is for locking into the groove; those taps are not measurements.
  warmupClicks: 4,
});

const DEFAULT_SUMMARY = Object.freeze({
  minSamples: 8,
  maxSpreadMs: 60,
  limitMs: 120,
  stepMs: 5,
});

function percentile(sortedValues, fraction) {
  if (!sortedValues.length) return NaN;
  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function offsetsFromTaps(clickTimes, tapTimes, options = {}) {
  const { maxDeviationSeconds, warmupClicks } = { ...DEFAULT_PAIRING, ...options };
  if (!Array.isArray(clickTimes) || !clickTimes.length) return [];
  if (!Array.isArray(tapTimes)) return [];

  const offsets = [];
  for (const tap of tapTimes) {
    if (!Number.isFinite(tap)) continue;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    clickTimes.forEach((click, index) => {
      const distance = Math.abs(tap - click);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    if (nearestIndex < warmupClicks) continue;
    const offset = tap - clickTimes[nearestIndex];
    if (Math.abs(offset) > maxDeviationSeconds) continue;
    offsets.push(offset);
  }
  return offsets;
}

export function summarizeCalibration(offsetsSeconds, options = {}) {
  const { minSamples, maxSpreadMs, limitMs, stepMs } = { ...DEFAULT_SUMMARY, ...options };
  const values = (offsetsSeconds ?? []).filter(Number.isFinite).map((v) => v * 1000);
  if (values.length < minSamples) {
    return { ok: false, reason: 'not-enough-taps', sampleCount: values.length };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const medianMs = percentile(sorted, 0.5);
  const spreadMs = percentile(sorted, 0.75) - percentile(sorted, 0.25);
  if (spreadMs > maxSpreadMs) {
    return {
      ok: false,
      reason: 'too-scattered',
      sampleCount: values.length,
      medianMs: Math.round(medianMs),
      spreadMs: Math.round(spreadMs),
    };
  }

  const stepped = Math.round(medianMs / stepMs) * stepMs;
  const suggestedOffsetMs = Math.max(-limitMs, Math.min(limitMs, stepped));
  return {
    ok: true,
    sampleCount: values.length,
    medianMs: Math.round(medianMs),
    spreadMs: Math.round(spreadMs),
    suggestedOffsetMs,
  };
}
