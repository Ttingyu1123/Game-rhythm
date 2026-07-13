# Main Theme Audio Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generated test song with the supplied Moonlit Gear Parade MP3 and a synchronized 130 BPM chart.

**Architecture:** Keep `AudioEngine` as the only playback clock and inject a decoded `AudioBuffer` through its existing `bufferFactory`. Keep song metadata and chart generation data-driven, while Vite owns the production asset URL.

**Tech Stack:** JavaScript ES modules, Web Audio API, Vite asset handling, Node test runner, Playwright.

---

### Task 1: Audio file loader

**Files:**
- Create: `src/audio/AudioFileLoader.js`
- Test: `tests/audio-file-loader.test.js`

1. Write failing tests for successful fetch/decode, HTTP failure, network failure and decode failure.
2. Run `cmd /c npm test -- tests/audio-file-loader.test.js`; expect a missing-module failure.
3. Implement `loadAudioFile(context, url, fetcher)` with clear Traditional Chinese errors.
4. Run the focused test and full test suite.

### Task 2: Formal song metadata and chart

**Files:**
- Modify: `src/data/songs.js`
- Modify: `tests/song-chart.test.js`

1. Change the existing chart test first to require `Moonlit Gear Parade`, 130 BPM, 76.8 seconds, a 0.024-second beat origin and at least 190 valid notes.
2. Run the focused test and confirm it fails against the 128 BPM generated song.
3. Implement the deterministic section-based chart and new song ID.
4. Run chart validation and the full suite.

### Task 3: Browser audio wiring and UI metadata

**Files:**
- Modify: `src/core/Game.js`
- Modify: `index.html`
- Modify: `README.md`

1. Add the Vite asset URL in `Game.js` and inject `loadAudioFile` into `AudioEngine`.
2. Update visible title, artist, BPM, duration, difficulty and source copy.
3. Update the README to describe the supplied audio and new chart.
4. Run all unit tests and `cmd /c npm run build`; verify that `dist/assets` contains the MP3.

### Task 4: Browser acceptance and delivery

**Files:**
- Modify: `tests/e2e_smoke.py`
- Preserve: `assets/music/main-theme.mp3`

1. Update E2E timeouts and the expected localStorage song ID.
2. Run desktop Playwright through a complete song, including hit, pause, resume, result and storage.
3. Run the landscape touch test and inspect screenshots.
4. Copy changed verified files into `D:\VibeCoding\Game-rhythm`, reinstall only if the lockfile changed, then rerun tests and build from the target folder.

The target folder still has no Git metadata, so this plan uses verified checkpoints rather than commits.
