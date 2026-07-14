import { LANES } from '../config.js';

export function validateChart(chart) {
  const errors = [];

  if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
    return ['Chart must be an object.'];
  }

  if (!Number.isFinite(chart.duration) || chart.duration <= 0) {
    errors.push('Song duration must be a positive number.');
  }

  if (!Array.isArray(chart.notes)) {
    errors.push('Chart notes must be an array.');
    return errors;
  }

  const ids = new Set();
  const laneTimes = new Set();
  const laneIntervals = new Map();
  let previousTime = -Infinity;
  const OVERLAP_EPSILON = 1e-9;

  chart.notes.forEach((note, index) => {
    const label = `Note ${index + 1}`;
    if (!note || typeof note !== 'object') {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (typeof note.id !== 'string' || note.id.length === 0) {
      errors.push(`${label} needs a unique string id.`);
    } else if (ids.has(note.id)) {
      errors.push(`${label} has a duplicate id: ${note.id}.`);
    } else {
      ids.add(note.id);
    }

    if (!LANES.includes(note.lane)) {
      errors.push(`${label} has an invalid lane: ${note.lane}.`);
    }

    const isHold = note.type === 'hold';
    if (note.type !== 'tap' && !isHold) {
      errors.push(`${label} has an unsupported type: ${note.type}.`);
    }

    let endTime = note.time;
    if (!Number.isFinite(note.time)) {
      errors.push(`${label} time must be a finite number.`);
    } else {
      if (note.time < 0) errors.push(`${label} has a negative time.`);
      if (Number.isFinite(chart.duration) && note.time > chart.duration) {
        errors.push(`${label} is outside song duration.`);
      }
      if (note.time < previousTime) {
        errors.push('Chart notes must be sorted by time.');
      }
      previousTime = note.time;
      endTime = note.time;

      if (isHold) {
        if (!Number.isFinite(note.duration) || note.duration <= 0) {
          errors.push(`${label} hold needs a positive duration.`);
        } else {
          endTime = note.time + note.duration;
          if (Number.isFinite(chart.duration) && endTime > chart.duration + OVERLAP_EPSILON) {
            errors.push(`${label} hold extends beyond song duration.`);
          }
        }
      }
    }

    if (LANES.includes(note.lane) && Number.isFinite(note.time)) {
      const laneTimeKey = `${note.lane}:${note.time.toFixed(6)}`;
      if (laneTimes.has(laneTimeKey)) {
        errors.push(`${label} has a duplicate lane/time pair.`);
      } else {
        laneTimes.add(laneTimeKey);
      }

      const intervals = laneIntervals.get(note.lane) ?? [];
      const overlaps = intervals.some(
        (interval) => note.time < interval.end - OVERLAP_EPSILON && interval.start < endTime - OVERLAP_EPSILON,
      );
      if (overlaps) {
        errors.push(`${label} overlaps another note in lane ${note.lane}.`);
      }
      intervals.push({ start: note.time, end: endTime });
      laneIntervals.set(note.lane, intervals);
    }
  });

  return errors;
}
