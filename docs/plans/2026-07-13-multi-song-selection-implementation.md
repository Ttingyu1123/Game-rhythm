# Multi-Song Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the single-song rhythm game into a data-driven song-selection system while keeping only the finished song playable.

**Architecture:** Put each song in its own module and register it in a validated immutable catalog. Let `Game` select catalog entries and reconfigure one reusable `AudioEngine`; let `AppUI` render song buttons and update every song-specific label.

**Tech Stack:** Vanilla JavaScript modules, Web Audio API, Vite, Node test runner, Python Playwright

---

### Task 1: Add the song catalog

**Files:**
- Create: `tests/song-catalog.test.js`
- Create: `src/data/songCatalog.js`
- Create: `src/data/songs/moonlitGearParade.js`
- Modify: `src/data/songs.js`

**Step 1: Write the failing test**

Test that the production catalog has one playable song, every ID is unique, the song has a file audio URL, and `findSongById()` can select either item from a two-song mock catalog. Test that duplicate IDs throw.

**Step 2: Run the test to verify it fails**

Run: `node --test tests/song-catalog.test.js`

Expected: FAIL because `src/data/songCatalog.js` does not exist.

**Step 3: Write the minimal implementation**

Move the current song definition to its own module, add its static MP3 URL, then export `createSongCatalog`, `SONG_CATALOG`, and `findSongById`. Keep `src/data/songs.js` as a compatibility re-export.

**Step 4: Run the tests**

Run: `node --test tests/song-catalog.test.js tests/song-chart.test.js`

Expected: all catalog and chart tests pass.

### Task 2: Reconfigure the audio engine safely

**Files:**
- Modify: `tests/audio-engine.test.js`
- Modify: `src/audio/AudioEngine.js`

**Step 1: Write the failing test**

Schedule the first song, call `configure()` with a second song, and assert that the first source stops, the old buffer clears, duration/BPM change, the timeline resets, and the second factory supplies the next buffer.

**Step 2: Run the test to verify it fails**

Run: `node --test tests/audio-engine.test.js`

Expected: FAIL because `configure` is undefined.

**Step 3: Implement `configure()`**

Validate positive duration and a function-valued buffer factory. Stop the current source, replace song configuration, clear `buffer`, and create a fresh `AudioTimeline` while retaining the context and gain nodes.

**Step 4: Run the test**

Run: `node --test tests/audio-engine.test.js`

Expected: all audio engine tests pass.

### Task 3: Add the responsive song library UI

**Files:**
- Modify: `tests/e2e_smoke.py`
- Modify: `tests/e2e_mobile.py`
- Modify: `index.html`
- Modify: `src/ui/AppUI.js`
- Modify: `src/styles/main.css`

**Step 1: Add failing acceptance assertions**

Assert one `[data-song-id]` button, one selected `aria-pressed="true"` song, a visible disabled new-song slot, dynamic song labels, and no 390px horizontal overflow.

**Step 2: Run desktop E2E to verify it fails**

Run the Vite server on port 5192, then run: `$env:BASE_URL='http://127.0.0.1:5192'; python tests/e2e_smoke.py`

Expected: FAIL because the song library DOM does not exist.

**Step 3: Implement the UI**

Add the library shell and dynamic IDs in HTML. Render song buttons with DOM APIs, update selected states and all visible song metadata in `AppUI`, and add responsive styles for desktop, tablet, and mobile.

**Step 4: Run desktop and mobile E2E**

Run:

```powershell
$env:BASE_URL='http://127.0.0.1:5192'; python tests/e2e_smoke.py
$env:BASE_URL='http://127.0.0.1:5192'; python tests/e2e_mobile.py
```

Expected: both scripts finish with their `*_OK` message and zero page or console errors.

### Task 4: Connect song selection to the game

**Files:**
- Modify: `src/core/Game.js`

**Step 1: Replace single-song imports**

Load `SONG_CATALOG`, choose its first song, and build the audio buffer factory from `song.audio`.

**Step 2: Bind song buttons**

Render the catalog before binding. Add `selectSong(songId)`, allow it only in the menu, reconfigure audio, restore the song's default difficulty, update UI, reset HUD, and load the matching record.

**Step 3: Run the full unit suite**

Run: `npm test`

Expected: all tests pass.

### Task 5: Document and verify the finished feature

**Files:**
- Modify: `README.md`

**Step 1: Document the catalog and add-song workflow**

Explain the song module fields, catalog registration, separate records, and the three steps required to add a song.

**Step 2: Build production output**

Run: `npm run build`

Expected: Vite completes successfully and emits a hashed MP3 asset.

**Step 3: Run final verification**

Run: `npm test`, desktop E2E, and mobile E2E again from a fresh server.

Expected: every unit test and both browser suites pass with no console or page errors.

**Step 4: Sync the verified files**

Copy only the changed source, test, documentation, HTML, and generated `dist` files from the staging copy to `D:\VibeCoding\Game-rhythm`, then repeat the build or smoke check against the target server.

The project has no Git repository, so there is no commit step.
