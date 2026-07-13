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
  let previousTime = -Infinity;

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

    if (note.type !== 'tap') {
      errors.push(`${label} has an unsupported type: ${note.type}.`);
    }

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
    }

    if (LANES.includes(note.lane) && Number.isFinite(note.time)) {
      const laneTimeKey = `${note.lane}:${note.time.toFixed(6)}`;
      if (laneTimes.has(laneTimeKey)) {
        errors.push(`${label} has a duplicate lane/time pair.`);
      } else {
        laneTimes.add(laneTimeKey);
      }
    }
  });

  return errors;
}
