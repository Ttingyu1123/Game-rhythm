# Moonlit Arcana MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable fantasy four-lane browser rhythm game whose generated music, notes, and judgments share one Web Audio clock.

**Architecture:** Keep rhythm rules as DOM-free ES modules, coordinate runtime state in one `Game` class, and render from absolute song time. Render a deterministic generated song into an `AudioBuffer` so pause and resume can recreate a source at an exact offset.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Canvas 2D, Web Audio API, Vite, Node test runner.

---

### Task 1: Project shell and chart contract

**Files:**
- Create: `package.json`, `index.html`, `src/config.js`
- Create: `src/data/songs.js`, `src/rhythm/ChartValidator.js`
- Test: `tests/chart-validator.test.js`, `tests/song-chart.test.js`

1. Write tests for valid charts, duplicate lane/time notes, invalid lanes, negative/out-of-range time, and the bundled chart.
2. Run `cmd /c npm test -- tests/chart-validator.test.js tests/song-chart.test.js`; expect failure because modules do not exist.
3. Implement the minimal validator and deterministic 128 BPM chart.
4. Run the same command; expect all tests to pass.

### Task 2: Judgment and session statistics

**Files:**
- Create: `src/rhythm/JudgmentSystem.js`, `src/rhythm/SessionStats.js`
- Test: `tests/judgment-system.test.js`, `tests/session-stats.test.js`

1. Write failing tests for nearest same-lane candidate selection, window boundaries, Early/Late signs, independent double notes, auto Miss, Combo, Gauge, accuracy, normalized score, grade and Full Combo.
2. Run both test files and confirm missing-module failures.
3. Implement small pure functions/classes that satisfy each behavior.
4. Run all tests and keep output clean.

### Task 3: Versioned local save

**Files:**
- Create: `src/storage/SaveStore.js`
- Test: `tests/save-store.test.js`

1. Write failing tests for defaults, record improvement, non-regression, settings persistence and corrupt JSON recovery using an in-memory Storage implementation.
2. Implement the versioned store with guarded parse/write operations.
3. Run `cmd /c npm test -- tests/save-store.test.js`, then the full suite.

### Task 4: Audio clock and generated fantasy song

**Files:**
- Create: `src/audio/SynthSong.js`, `src/audio/AudioEngine.js`
- Test: `tests/audio-timeline.test.js`

1. Write failing pure timeline tests for scheduled start, pause offset and resume offset.
2. Implement timeline helpers, then `AudioEngine` around one lazily created AudioContext.
3. Build a deterministic D-minor buffer with kick, snare, hat, bass, celesta-like lead and arpeggio.
4. Run the full suite. Manually verify that stop/restart never reuses a source node.

### Task 5: Game loop, input and renderer

**Files:**
- Create: `src/core/Game.js`, `src/input/InputManager.js`
- Create: `src/rendering/CanvasRenderer.js`, `src/ui/AppUI.js`, `src/main.js`

1. Add a failing test for the pure note-position formula and state transition guards.
2. Implement one RAF loop and absolute-time rendering.
3. Wire keyboard, D/F/J/K, pointer multi-touch, countdown, play, pause, resume, restart and results.
4. Confirm listeners and RAF handles have explicit cleanup paths.

### Task 6: Moonlight festival presentation and delivery

**Files:**
- Create: `src/styles/main.css`, `README.md`, `.gitignore`
- Copy: preserve target `assets/music/` for the future `main-theme.mp3`

1. Implement the indigo, moon-violet, star-gold visual system with responsive layouts and reduced-motion support.
2. Run `cmd /c npm install`, `cmd /c npm test`, and `cmd /c npm run build`.
3. Start Vite, exercise menu, countdown, play, pause, resume, restart, touch controls and results in a browser, and inspect console output.
4. Copy verified files into `D:\VibeCoding\Game-rhythm` without deleting its existing `assets/music` directory.

The target folder has no Git metadata, so this run uses verified checkpoints rather than commits. If the user later initializes Git, commit the design, tests and implementation as separate logical changes.
