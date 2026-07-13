const JUDGMENTS = Object.freeze({
  marvelous: { points: 1000, accuracy: 1, gauge: 1 },
  perfect: { points: 900, accuracy: 0.95, gauge: 0.8 },
  great: { points: 700, accuracy: 0.75, gauge: 0.4 },
  good: { points: 400, accuracy: 0.45, gauge: -0.5 },
  miss: { points: 0, accuracy: 0, gauge: -8 },
});

export const GRADE_THRESHOLDS = Object.freeze([
  [99.5, 'SSS'],
  [98, 'SS'],
  [95, 'S'],
  [90, 'A'],
  [80, 'B'],
  [70, 'C'],
  [0, 'D'],
]);

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function gradeForAccuracy(accuracy) {
  return GRADE_THRESHOLDS.find(([minimum]) => accuracy >= minimum)?.[1] ?? 'D';
}

export class SessionStats {
  constructor(totalNotes) {
    if (!Number.isInteger(totalNotes) || totalNotes <= 0) {
      throw new TypeError('totalNotes must be a positive integer.');
    }
    this.totalNotes = totalNotes;
    this.counts = { marvelous: 0, perfect: 0, great: 0, good: 0, miss: 0 };
    this.combo = 0;
    this.maxCombo = 0;
    this.gauge = 50;
    this.rawPoints = 0;
    this.accuracyWeight = 0;
    this.hitOffsets = [];
    this.early = 0;
    this.late = 0;
    this.processed = 0;
    this.locked = false;
  }

  apply(judgment, offset = null) {
    if (this.locked || this.processed >= this.totalNotes || !JUDGMENTS[judgment]) return false;

    const rule = JUDGMENTS[judgment];
    this.counts[judgment] += 1;
    this.processed += 1;
    this.rawPoints += rule.points;
    this.accuracyWeight += rule.accuracy;
    this.gauge = round(Math.min(100, Math.max(0, this.gauge + rule.gauge)), 1);

    if (judgment === 'miss') {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (Number.isFinite(offset)) {
        this.hitOffsets.push(offset);
        if (offset < 0) this.early += 1;
        if (offset > 0) this.late += 1;
      }
    }

    return true;
  }

  snapshot() {
    const score = Math.round((this.rawPoints / (this.totalNotes * 1000)) * 1_000_000);
    const accuracy = round((this.accuracyWeight / this.totalNotes) * 100);
    const fullCombo = this.processed === this.totalNotes && this.counts.miss === 0;
    const allPerfect = fullCombo && this.counts.great === 0 && this.counts.good === 0;
    const averageOffset = this.hitOffsets.length
      ? this.hitOffsets.reduce((sum, value) => sum + value, 0) / this.hitOffsets.length
      : 0;

    return {
      score,
      accuracy,
      grade: gradeForAccuracy(accuracy),
      combo: this.combo,
      maxCombo: this.maxCombo,
      gauge: this.gauge,
      counts: { ...this.counts },
      early: this.early,
      late: this.late,
      averageOffsetMs: round(averageOffset * 1000),
      fullCombo,
      allPerfect,
      processed: this.processed,
      totalNotes: this.totalNotes,
    };
  }

  finalize() {
    this.locked = true;
    return this.snapshot();
  }
}
