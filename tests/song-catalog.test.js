import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SONG_CATALOG,
  createSongCatalog,
  findSongById,
} from '../src/data/songCatalog.js';

const createMockSong = (id) => ({
  id,
  title: `曲目 ${id}`,
  titleEn: `Song ${id}`,
  artist: 'Test Artist',
  chapter: '測試章節',
  bpm: 120,
  key: 'C minor',
  duration: 60,
  sourceLabel: '測試音訊',
  audio: { type: 'file', url: `https://example.test/${id}.mp3` },
  defaultDifficulty: 1,
  difficulties: [{ id: 'beginner', level: 1, label: '入門' }],
  createChart: () => ({ songId: id, notes: [] }),
});

test('production catalog exposes all four playable songs in chapter order', () => {
  const expectedSongs = [
    ['moonlit-gear-parade', 'main-theme.mp3'],
    ['swing-carnival', 'Swing_Carnival.mp3'],
    ['dancing-on-a-cloud', 'Dancing_on_a_Cloud.mp3'],
    ['parade-of-paws', 'Parade_of_Paws.mp3'],
  ];

  assert.equal(SONG_CATALOG.length, 4);
  assert.equal(Object.isFrozen(SONG_CATALOG), true);
  assert.deepEqual(SONG_CATALOG.map(({ id }) => id), expectedSongs.map(([id]) => id));

  SONG_CATALOG.forEach((song, index) => {
    assert.equal(song.audio.type, 'file');
    assert.ok(song.audio.url.endsWith(expectedSongs[index][1]));
    assert.equal(typeof song.createChart, 'function');
    assert.equal(song.difficulties.length, 4);
  });
});

test('findSongById selects a requested song and falls back to the first entry', () => {
  const first = createMockSong('first');
  const second = createMockSong('second');
  const catalog = createSongCatalog([first, second]);

  assert.equal(findSongById('second', catalog), second);
  assert.equal(findSongById('missing', catalog), first);
});

test('catalog rejects duplicate song ids', () => {
  const first = createMockSong('duplicate');
  const second = createMockSong('duplicate');

  assert.throws(
    () => createSongCatalog([first, second]),
    /歌曲 ID 不可重複：duplicate/,
  );
});
