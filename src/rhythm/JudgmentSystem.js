export const DEFAULT_WINDOWS = Object.freeze({
  marvelous: 0.03,
  perfect: 0.055,
  great: 0.09,
  good: 0.14,
});

const EPSILON = 1e-9;

const JUDGMENT_TIER = Object.freeze({ marvelous: 4, perfect: 3, great: 2, good: 1, miss: 0 });

function worseJudgment(a, b) {
  return JUDGMENT_TIER[a] <= JUDGMENT_TIER[b] ? a : b;
}

function isHoldNote(note) {
  return note.type === 'hold' && Number.isFinite(note.duration) && note.duration > 0;
}

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
    if (note.judged || note.holdActive || note.lane !== lane) continue;
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

  const hold = isHoldNote(candidate);
  candidate.hitOffset = offset;
  candidate.headJudgment = judgment;
  if (hold) {
    // A hold is not fully judged until its tail resolves on release or auto-completion.
    candidate.holdActive = true;
  } else {
    candidate.judged = true;
    candidate.judgment = judgment;
  }

  return {
    note: candidate,
    judgment,
    offset,
    // Within the marvelous window the hit IS on time by the game's own definition;
    // flagging a ±10ms press as EARLY/LATE is noise, not feedback.
    timing: offset < -windows.marvelous ? 'early' : offset > windows.marvelous ? 'late' : 'on-time',
    isHold: hold,
    phase: hold ? 'head' : 'tap',
  };
}

export function resolveHoldRelease(notes, lane, songTime, windows = DEFAULT_WINDOWS) {
  const note = notes.find((candidate) => candidate.holdActive && !candidate.judged && candidate.lane === lane);
  if (!note) return null;

  const endTime = note.time + note.duration;
  const releaseOffset = songTime - endTime;
  note.holdActive = false;
  note.judged = true;
  note.releaseOffset = releaseOffset;

  // Released well before the tail = broken hold, partial credit only.
  if (songTime < endTime - windows.good - EPSILON) {
    note.judgment = 'good';
    note.broken = true;
    return { note, judgment: 'good', phase: 'tail', broken: true, releaseOffset };
  }

  note.broken = false;
  // Held past the end and released late = fully sustained, graded by the head.
  if (releaseOffset > windows.good + EPSILON) {
    const judgment = note.headJudgment ?? 'marvelous';
    note.judgment = judgment;
    return { note, judgment, phase: 'tail', broken: false, releaseOffset };
  }

  // Released within the tail window = graded by the worse of head and tail timing.
  const tailJudgment = classifyOffset(releaseOffset, windows) ?? 'good';
  const judgment = worseJudgment(note.headJudgment ?? tailJudgment, tailJudgment);
  note.judgment = judgment;
  return { note, judgment, phase: 'tail', broken: false, releaseOffset };
}

export function resolveAutoMisses(notes, songTime, maxWindow = DEFAULT_WINDOWS.good) {
  const resolved = [];

  for (const note of notes) {
    if (note.judged) continue;

    if (note.holdActive) {
      // Still held past the tail without releasing = sustained success.
      const endTime = note.time + note.duration;
      if (songTime > endTime + maxWindow + EPSILON) {
        note.holdActive = false;
        note.judged = true;
        note.judgment = note.headJudgment ?? 'marvelous';
        note.autoCompleted = true;
        resolved.push(note);
      }
      continue;
    }

    // Head (tap or hold) never pressed and now past the window.
    if (songTime - note.time > maxWindow + EPSILON) {
      note.judged = true;
      note.judgment = 'miss';
      note.hitOffset = null;
      resolved.push(note);
    }
  }

  return resolved;
}
