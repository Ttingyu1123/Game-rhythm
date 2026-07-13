const SAVE_VERSION = 1;
const GRADE_RANK = Object.freeze({ D: 0, C: 1, B: 2, A: 3, S: 4, SS: 5, SSS: 6 });

function defaults() {
  return {
    saveVersion: SAVE_VERSION,
    settings: {
      masterVolume: 0.8,
      scrollSpeed: 1,
      reducedMotion: false,
    },
    records: {},
  };
}

function normalizeSave(candidate) {
  const base = defaults();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return base;

  return {
    saveVersion: SAVE_VERSION,
    settings: {
      ...base.settings,
      ...(candidate.settings && typeof candidate.settings === 'object' ? candidate.settings : {}),
    },
    records: candidate.records && typeof candidate.records === 'object' && !Array.isArray(candidate.records)
      ? candidate.records
      : {},
  };
}

export class SaveStore {
  constructor(storage = globalThis.localStorage, key = 'moonlit-arcana-save') {
    this.storage = storage;
    this.key = key;
  }

  load() {
    let raw = null;
    try {
      raw = this.storage?.getItem(this.key);
      if (!raw) return defaults();
      return normalizeSave(JSON.parse(raw));
    } catch {
      if (raw !== null) {
        try {
          this.storage?.setItem(`${this.key}.corrupt`, raw);
        } catch {
          // A disabled or full storage must not prevent the game from starting.
        }
      }
      return defaults();
    }
  }

  write(data) {
    const normalized = normalizeSave(data);
    try {
      this.storage?.setItem(this.key, JSON.stringify(normalized));
      return true;
    } catch {
      return false;
    }
  }

  updateSettings(partial) {
    const data = this.load();
    data.settings = { ...data.settings, ...partial };
    this.write(data);
    return { ...data.settings };
  }

  getRecord(songId, difficulty) {
    return this.load().records?.[songId]?.[difficulty] ?? null;
  }

  saveRecord(songId, difficulty, result) {
    const data = this.load();
    data.records[songId] ??= {};
    const previous = data.records[songId][difficulty] ?? {
      highScore: 0,
      bestAccuracy: 0,
      bestGrade: 'D',
      maxCombo: 0,
      fullCombo: false,
      playCount: 0,
    };

    const candidateGrade = GRADE_RANK[result.grade] >= GRADE_RANK[previous.bestGrade]
      ? result.grade
      : previous.bestGrade;
    const next = {
      highScore: Math.max(previous.highScore, Number(result.score) || 0),
      bestAccuracy: Math.max(previous.bestAccuracy, Number(result.accuracy) || 0),
      bestGrade: candidateGrade,
      maxCombo: Math.max(previous.maxCombo, Number(result.maxCombo) || 0),
      fullCombo: previous.fullCombo || Boolean(result.fullCombo),
      playCount: previous.playCount + 1,
    };

    data.records[songId][difficulty] = next;
    this.write(data);
    return { ...next };
  }

  reset() {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // Returning defaults is still safe when storage cannot be modified.
    }
    const data = defaults();
    this.write(data);
    return data;
  }
}
