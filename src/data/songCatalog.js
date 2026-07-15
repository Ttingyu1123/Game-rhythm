import { DANCING_ON_A_CLOUD } from './songs/dancingOnACloud.js';
import { MINIATURE_WORLD } from './songs/miniatureWorld.js';
import { MOONLIT_GEAR_PARADE } from './songs/moonlitGearParade.js';
import { NEON_MIRAGE } from './songs/neonMirage.js';
import { PARADE_OF_PAWS } from './songs/paradeOfPaws.js';
import { SWING_CARNIVAL } from './songs/swingCarnival.js';
import { WHIMSICAL_CUTE } from './songs/whimsicalCute.js';

function assertSong(song, index) {
  if (!song || typeof song !== 'object') {
    throw new TypeError(`曲庫第 ${index + 1} 筆不是歌曲物件。`);
  }
  if (typeof song.id !== 'string' || !song.id.trim()) {
    throw new TypeError(`曲庫第 ${index + 1} 筆缺少歌曲 ID。`);
  }
  if (typeof song.title !== 'string' || !song.title.trim()) {
    throw new TypeError(`歌曲 ${song.id} 缺少曲名。`);
  }
  if (!Number.isFinite(song.duration) || song.duration <= 0) {
    throw new TypeError(`歌曲 ${song.id} 的長度無效。`);
  }
  if (!Number.isFinite(song.bpm) || song.bpm <= 0) {
    throw new TypeError(`歌曲 ${song.id} 的 BPM 無效。`);
  }
  if (!song.audio || song.audio.type !== 'file' || typeof song.audio.url !== 'string') {
    throw new TypeError(`歌曲 ${song.id} 缺少可載入的音訊。`);
  }
  if (!Array.isArray(song.difficulties) || !song.difficulties.length) {
    throw new TypeError(`歌曲 ${song.id} 缺少難度資料。`);
  }
  if (typeof song.createChart !== 'function') {
    throw new TypeError(`歌曲 ${song.id} 缺少譜面工廠。`);
  }
}

export function createSongCatalog(songs) {
  if (!Array.isArray(songs) || !songs.length) {
    throw new TypeError('曲庫至少需要一首歌曲。');
  }

  const ids = new Set();
  songs.forEach((song, index) => {
    assertSong(song, index);
    if (ids.has(song.id)) throw new Error(`歌曲 ID 不可重複：${song.id}`);
    ids.add(song.id);
  });

  return Object.freeze([...songs]);
}

export function findSongById(songId, catalog = SONG_CATALOG) {
  return catalog.find((song) => song.id === songId) ?? catalog[0] ?? null;
}

export const SONG_CATALOG = createSongCatalog([
  MOONLIT_GEAR_PARADE,
  SWING_CARNIVAL,
  DANCING_ON_A_CLOUD,
  PARADE_OF_PAWS,
  WHIMSICAL_CUTE,
  MINIATURE_WORLD,
  NEON_MIRAGE,
]);
