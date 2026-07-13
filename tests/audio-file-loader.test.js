import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAudioFile } from '../src/audio/AudioFileLoader.js';

test('fetches and decodes an audio file into an AudioBuffer', async () => {
  const encoded = new ArrayBuffer(16);
  const decoded = { duration: 76.8, numberOfChannels: 2 };
  const requests = [];
  const fetcher = async (...args) => {
    requests.push(args);
    return { ok: true, status: 200, arrayBuffer: async () => encoded };
  };
  const context = {
    decodeAudioData: async (payload) => {
      assert.equal(payload, encoded);
      return decoded;
    },
  };

  const result = await loadAudioFile(context, '/assets/main-theme.mp3', fetcher);

  assert.equal(result, decoded);
  assert.equal(requests[0][0], '/assets/main-theme.mp3');
  assert.deepEqual(requests[0][1], { cache: 'force-cache' });
});

test('reports the HTTP status when the music file is unavailable', async () => {
  const fetcher = async () => ({ ok: false, status: 404 });

  await assert.rejects(
    () => loadAudioFile({ decodeAudioData() {} }, '/missing.mp3', fetcher),
    /無法載入音樂檔案.*404/,
  );
});

test('turns a network failure into a readable music loading error', async () => {
  const fetcher = async () => {
    throw new TypeError('Failed to fetch');
  };

  await assert.rejects(
    () => loadAudioFile({ decodeAudioData() {} }, '/offline.mp3', fetcher),
    /音樂檔案連線失敗/,
  );
});

test('reports invalid or unsupported audio data', async () => {
  const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) });
  const context = {
    decodeAudioData: async () => {
      throw new DOMException('Unable to decode', 'EncodingError');
    },
  };

  await assert.rejects(
    () => loadAudioFile(context, '/broken.mp3', fetcher),
    /無法解碼音樂檔案/,
  );
});
