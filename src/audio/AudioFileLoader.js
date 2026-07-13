export async function loadAudioFile(audioContext, url, fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(url, { cache: 'force-cache' });
  } catch (cause) {
    throw new Error('音樂檔案連線失敗，請確認本機伺服器與網路狀態。', { cause });
  }

  if (!response?.ok) {
    throw new Error(`無法載入音樂檔案（HTTP ${response?.status ?? 'unknown'}）。`);
  }

  let encoded;
  try {
    encoded = await response.arrayBuffer();
  } catch (cause) {
    throw new Error('無法讀取音樂檔案內容。', { cause });
  }

  try {
    return await audioContext.decodeAudioData(encoded);
  } catch (cause) {
    throw new Error('無法解碼音樂檔案，請確認檔案是有效的 MP3。', { cause });
  }
}
