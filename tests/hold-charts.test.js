import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_CATALOG } from '../src/data/songCatalog.js';
import { validateChart } from '../src/rhythm/ChartValidator.js';

test('every song introduces sustained holds only at the expert level', () => {
  for (const song of SONG_CATALOG) {
    for (const level of [1, 2, 3]) {
      const holds = song.createChart(level).notes.filter((note) => note.type === 'hold');
      assert.equal(holds.length, 0, `${song.id} Lv.${level} 不應有長按`);
    }

    const expert = song.createChart(4);
    const holds = expert.notes.filter((note) => note.type === 'hold');
    assert.ok(holds.length >= 4, `${song.id} 專家級應有數個長按，實際 ${holds.length}`);
    assert.deepEqual(validateChart(expert), [], `${song.id} 專家譜面應通過驗證`);

    for (const hold of holds) {
      assert.ok(Number.isFinite(hold.duration) && hold.duration > 0, `${song.id} 長按需要正的長度`);
      assert.ok(hold.time + hold.duration < expert.duration, `${song.id} 長按尾端需在歌曲內`);
    }
  }
});
