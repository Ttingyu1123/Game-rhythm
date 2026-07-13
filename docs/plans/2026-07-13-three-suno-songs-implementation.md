# Three Suno Songs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three Suno songs to the playable catalog with four deterministic difficulty charts per song.

**Architecture:** A reusable 12-pulse tap-chart builder handles timing, de-duplication, doubles, stable IDs, and derived note counts. Each song module supplies metadata, a static Vite audio URL, and a small recipe that layers notes by difficulty.

**Tech Stack:** Vanilla JavaScript modules, Web Audio API, Vite, Node test runner, Python Playwright

---

### Task 1: Build the reusable chart factory

**Files:**
- Create: `tests/tap-chart-factory.test.js`
- Create: `src/rhythm/TapChartFactory.js`

**Step 1: Write the failing test**

Create a two-level sample recipe. Assert computed note counts, overlap de-duplication, explicit doubles, stable output, independent chart objects, 12-pulse timing, and unknown-level fallback.

**Step 2: Verify RED**

Run: `node --test tests/tap-chart-factory.test.js`

Expected: FAIL because `TapChartFactory.js` does not exist.

**Step 3: Implement the minimal factory**

Implement `createTapChartSet({ songId, bpm, duration, beatOffset, idPrefix, difficulties, build })`. Expose `addNote`, `addRange`, and `addDouble` to recipes. Derive frozen difficulty metadata from generated templates and clone notes on every `createChart()` call.

**Step 4: Verify GREEN**

Run: `node --test tests/tap-chart-factory.test.js`

Expected: all factory tests pass.

### Task 2: Specify the new catalog and charts

**Files:**
- Modify: `tests/song-catalog.test.js`
- Create: `tests/new-song-charts.test.js`

**Step 1: Write failing catalog assertions**

Require four catalog IDs in order and the three new MP3 filenames.

**Step 2: Write failing chart assertions**

For every new song and level, require validator success, expected metadata, increasing note-count ranges, exact double counts, subset progression, 12-pulse alignment, and safe final notes.

**Step 3: Verify RED**

Run: `node --test tests/song-catalog.test.js tests/new-song-charts.test.js`

Expected: FAIL because the new song exports and catalog entries do not exist.

### Task 3: Add the song modules

**Files:**
- Create: `src/data/songs/swingCarnival.js`
- Create: `src/data/songs/dancingOnACloud.js`
- Create: `src/data/songs/paradeOfPaws.js`
- Modify: `src/data/songCatalog.js`
- Modify: `src/data/songs.js`

**Step 1: Add Swing Carnival**

Use 111 BPM, 69.8 seconds, zero offset, G major, swing offbeats, 6 Lv.3 doubles, and 16 Lv.4 doubles.

**Step 2: Add Dancing on a Cloud**

Use 127 BPM, 153.56 seconds, zero offset, A minor, flowing straight-eighth sections, 12 Lv.3 doubles, and 28 Lv.4 doubles.

**Step 3: Add Parade of Paws**

Use 100 BPM, 94.96 seconds, 0.021-second offset, C major, alternating paw patterns, 8 Lv.3 doubles, and 20 Lv.4 doubles.

**Step 4: Register and export all songs**

Keep Moonlit first, followed by Swing, Dancing, and Parade.

**Step 5: Verify GREEN**

Run: `node --test tests/tap-chart-factory.test.js tests/song-catalog.test.js tests/new-song-charts.test.js tests/song-chart.test.js`

Expected: all factory, catalog, old-chart, and new-chart tests pass.

### Task 4: Adapt the four-song interface

**Files:**
- Modify: `tests/e2e_smoke.py`
- Modify: `tests/e2e_mobile.py`
- Modify: `index.html`
- Modify: `src/styles/main.css`

**Step 1: Write failing E2E assertions**

Require four song buttons, `4 首可遊玩`, no empty slot, one selected song, keyboard selection of the second and third songs, correct metadata, and mobile access to all four songs.

**Step 2: Verify RED**

Run desktop E2E against the current staging server.

Expected: FAIL because only one song and the empty slot remain.

**Step 3: Implement responsive changes**

Remove the empty slot. At 521–980px make the list span the library and use two columns; at 520px return to one column. Keep desktop internal scrolling and protect long titles and focus outlines.

**Step 4: Run browser tests**

Run desktop and mobile Playwright scripts.

Expected: both finish with their `*_OK` messages and zero console/page errors.

### Task 5: Document, build, and sync

**Files:**
- Modify: `README.md`

**Step 1: Update the song list and chart locations**

Document all four songs and their audio calibration.

**Step 2: Run the full unit suite**

Run: `cmd /c npm test`

Expected: zero failures.

**Step 3: Build production assets**

Run: `cmd /c npm run build`

Expected: Vite emits all four hashed MP3 files.

**Step 4: Run production desktop and mobile E2E**

Use the webapp-testing server helper against `npm run preview`.

Expected: both browser suites pass with zero console/page errors.

**Step 5: Sync and verify the target**

Copy changed source, tests, docs, and the three provided MP3 files to `D:\VibeCoding\Game-rhythm`. Build and test in the target folder, then run a smoke test against its live server.

The project has no Git repository, so there is no commit step.
