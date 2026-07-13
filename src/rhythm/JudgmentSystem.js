export const DEFAULT_WINDOWS = Object.freeze({
  marvelous: 0.03,
  perfect: 0.055,
  great: 0.09,
  good: 0.14,
});

const EPSILON = 1e-9;

export function classifyOffset(offset, windows = DEFAULT_WINDOWS) {
  const distance = Math.abs(offset);
  if (distance <= windows.marvelous + EPSILON) return 'marvelous';
  if (distance <= windows.perfect + EPSILON) return 'perfect';
  if (distance <= windows.great + EPSILON) return 'great';
  if (distance <= windows.good + EPSILON) return 'good';
  return null;
}

export function resolvePress(notes, lane, songTime, windows = DEFAULT_WINDOWS) {
  let candidate = null;
  let closestDistance = Infinity;

  for (const note of notes) {
    if (note.judged || note.lane !== lane) continue;
    const distance = Math.abs(songTime - note.time);
    if (distance > windows.good + EPSILON) continue;
    if (distance < closestDistance || (distance === closestDistance && note.time < candidate?.time)) {
      candidate = note;
      closestDistance = distance;
    }
  }

  if (!candidate) return null;

  const offset = songTime - candidate.time;
  const judgment = classifyOffset(offset, windows);
  if (!judgment) return null;

  candidate.judged = true;
  candidate.judgment = judgment;
  candidate.hitOffset = offset;

  return {
    note: candidate,
    judgment,
    offset,
    timing: offset < 0 ? 'early' : offset > 0 ? 'late' : 'on-time',
  };
}

export function resolveAutoMisses(notes, songTime, maxWindow = DEFAULT_WINDOWS.good) {
  const missed = [];

  for (const note of notes) {
    if (note.judged || songTime - note.time <= maxWindow + EPSILON) continue;
    note.judged = true;
    note.judgment = 'miss';
    note.hitOffset = null;
    missed.push(note);
  }

  return missed;
}
