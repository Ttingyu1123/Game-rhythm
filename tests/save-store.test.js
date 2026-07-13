import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore } from '../src/storage/SaveStore.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('loads safe versioned defaults when no save exists', () => {
  const store = new SaveStore(new MemoryStorage());

  const data = store.load();

  assert.equal(data.saveVersion, 1);
  assert.equal(data.settings.masterVolume, 0.8);
  assert.equal(data.settings.scrollSpeed, 1);
  assert.deepEqual(data.records, {});
});

test('keeps independent best values while increasing play count', () => {
  const store = new SaveStore(new MemoryStorage());

  store.saveRecord('moonlit-prelude', 'apprentice', {
    score: 900000,
    accuracy: 95,
    grade: 'S',
    maxCombo: 100,
    fullCombo: false,
  });
  const record = store.saveRecord('moonlit-prelude', 'apprentice', {
    score: 850000,
    accuracy: 98,
    grade: 'SS',
    maxCombo: 90,
    fullCombo: true,
  });

  assert.equal(record.highScore, 900000);
  assert.equal(record.bestAccuracy, 98);
  assert.equal(record.bestGrade, 'SS');
  assert.equal(record.maxCombo, 100);
  assert.equal(record.fullCombo, true);
  assert.equal(record.playCount, 2);
});

test('persists merged settings for a later store instance', () => {
  const storage = new MemoryStorage();
  const first = new SaveStore(storage);
  first.updateSettings({ masterVolume: 0.55, scrollSpeed: 1.5 });

  const second = new SaveStore(storage);
  const settings = second.load().settings;

  assert.equal(settings.masterVolume, 0.55);
  assert.equal(settings.scrollSpeed, 1.5);
});

test('recovers from corrupt JSON and preserves the bad payload for diagnosis', () => {
  const storage = new MemoryStorage();
  storage.setItem('moonlit-arcana-save', '{broken json');
  const store = new SaveStore(storage);

  const data = store.load();

  assert.equal(data.saveVersion, 1);
  assert.deepEqual(data.records, {});
  assert.equal(storage.getItem('moonlit-arcana-save.corrupt'), '{broken json');
});

test('reset removes records while restoring default settings', () => {
  const store = new SaveStore(new MemoryStorage());
  store.updateSettings({ masterVolume: 0.2 });
  store.saveRecord('moonlit-prelude', 'apprentice', {
    score: 1,
    accuracy: 1,
    grade: 'D',
    maxCombo: 1,
    fullCombo: false,
  });

  const data = store.reset();

  assert.equal(data.settings.masterVolume, 0.8);
  assert.deepEqual(data.records, {});
});
