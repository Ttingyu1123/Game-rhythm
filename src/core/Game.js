import { AudioEngine } from '../audio/AudioEngine.js';
import { loadAudioFile } from '../audio/AudioFileLoader.js';
import { SONG_CATALOG, findSongById } from '../data/songCatalog.js';
import { InputManager } from '../input/InputManager.js';
import { CanvasRenderer } from '../rendering/CanvasRenderer.js';
import { validateChart } from '../rhythm/ChartValidator.js';
import { resolveAutoMisses, resolvePress } from '../rhythm/JudgmentSystem.js';
import { SessionStats } from '../rhythm/SessionStats.js';
import { SaveStore } from '../storage/SaveStore.js';
import { AppUI } from '../ui/AppUI.js';
import { GameStateMachine } from './GameState.js';

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));

const AUDIO_OFFSET_LIMIT_MS = 120;
const clampOffsetMs = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-AUDIO_OFFSET_LIMIT_MS, Math.min(AUDIO_OFFSET_LIMIT_MS, number));
};

const createBufferFactory = (song) => {
  if (song.audio.type !== 'file') throw new Error(`不支援的音訊類型：${song.audio.type}`);
  return (context) => loadAudioFile(context, song.audio.url);
};

export class Game {
  constructor(root = document) {
    this.songs = SONG_CATALOG;
    this.song = this.songs[0];
    this.selectedDifficulty = this.song.difficulties.find(
      ({ level }) => level === this.song.defaultDifficulty,
    ) ?? this.song.difficulties[0];
    this.ui = new AppUI(root);
    this.saveStore = new SaveStore();
    this.settings = this.saveStore.load().settings;
    this.state = new GameStateMachine();
    this.renderer = new CanvasRenderer(this.ui.elements['game-canvas']);
    this.audio = new AudioEngine({
      duration: this.song.duration,
      bpm: this.song.bpm,
      volume: this.settings.masterVolume,
      bufferFactory: createBufferFactory(this.song),
    });
    this.input = new InputManager({
      onLanePress: (lane) => this.handleLanePress(lane),
      onLaneRelease: (lane) => this.handleLaneRelease(lane),
      onPause: () => this.togglePause(),
      onRestart: () => this.restartFromShortcut(),
      onConfirm: () => this.confirmCurrentScreen(),
    });

    this.chart = null;
    this.stats = null;
    this.pressedLanes = new Set();
    this.rafId = null;
    this.sessionToken = 0;
    this.resumePending = false;
    this.frame = this.frame.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);

    this.ui.renderSongCatalog(this.songs, this.song.id);
    this.ui.updateSong(this.song);
    this.bindUI();
    this.input.attach(document, this.ui.elements['touch-controls']);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.applyStoredSettings();
    this.ui.updateDifficulty(this.selectedDifficulty);
    this.refreshRecord();
    this.ui.resetHud(this.song.duration);
    this.ui.showScreen('menu');
  }

  bindUI() {
    const el = this.ui.elements;
    el['start-button'].addEventListener('click', () => this.startNewSession());
    el['pause-button'].addEventListener('click', () => this.togglePause());
    el['resume-button'].addEventListener('click', () => this.resumeSession());
    el['restart-button'].addEventListener('click', () => this.startNewSession());
    el['quit-button'].addEventListener('click', () => this.returnToMenu());
    el['result-menu-button'].addEventListener('click', () => this.returnToMenu());
    el['replay-button'].addEventListener('click', () => this.startNewSession());
    el['help-button'].addEventListener('click', () => this.ui.showHelp(true));
    el['help-close-button'].addEventListener('click', () => this.ui.showHelp(false));
    el['help-overlay'].addEventListener('click', (event) => {
      if (event.target === el['help-overlay']) this.ui.showHelp(false);
    });
    this.ui.difficultyButtons.forEach((button) => {
      button.addEventListener('click', () => this.selectDifficulty(Number(button.dataset.difficultyLevel)));
    });
    this.ui.songButtons.forEach((button) => {
      button.addEventListener('click', () => this.selectSong(button.dataset.songId));
    });

    const updateVolume = (value) => {
      const masterVolume = Number(value);
      this.settings = this.saveStore.updateSettings({ masterVolume });
      this.audio.setVolume(masterVolume);
      el['volume-slider'].value = masterVolume;
      el['pause-volume'].value = masterVolume;
    };
    el['volume-slider'].addEventListener('input', (event) => updateVolume(event.target.value));
    el['pause-volume'].addEventListener('input', (event) => updateVolume(event.target.value));

    const updateSpeed = (value) => {
      const scrollSpeed = Number(value);
      this.settings = this.saveStore.updateSettings({ scrollSpeed });
      el['speed-select'].value = scrollSpeed;
      el['pause-speed'].value = scrollSpeed;
    };
    el['speed-select'].addEventListener('change', (event) => updateSpeed(event.target.value));
    el['pause-speed'].addEventListener('change', (event) => updateSpeed(event.target.value));

    el['offset-slider'].addEventListener('input', (event) => {
      const audioOffsetMs = clampOffsetMs(event.target.value);
      this.settings = this.saveStore.updateSettings({ audioOffsetMs });
      this.ui.setAudioOffsetDisplay(audioOffsetMs);
    });

    el['reduced-motion'].addEventListener('change', (event) => {
      const reducedMotion = event.target.checked;
      this.settings = this.saveStore.updateSettings({ reducedMotion });
      this.renderer.setReducedMotion(reducedMotion);
      document.body.classList.toggle('reduced-motion', reducedMotion);
    });
  }

  applyStoredSettings() {
    this.ui.syncSettings(this.settings);
    this.audio.setVolume(this.settings.masterVolume);
    this.renderer.setReducedMotion(this.settings.reducedMotion);
    document.body.classList.toggle('reduced-motion', this.settings.reducedMotion);
  }

  refreshRecord() {
    this.ui.updateRecord(this.saveStore.getRecord(this.song.id, this.selectedDifficulty.id));
  }

  selectSong(songId) {
    if (this.state.current !== 'menu') return false;
    const song = findSongById(songId, this.songs);
    if (!song || song.id !== songId) return false;
    if (song === this.song) return true;

    this.audio.configure({
      duration: song.duration,
      bpm: song.bpm,
      bufferFactory: createBufferFactory(song),
    });
    this.song = song;
    this.selectedDifficulty = song.difficulties.find(
      ({ level }) => level === song.defaultDifficulty,
    ) ?? song.difficulties[0];
    this.ui.updateSong(song);
    this.ui.updateDifficulty(this.selectedDifficulty);
    this.ui.resetHud(song.duration);
    this.refreshRecord();
    return true;
  }

  selectDifficulty(level) {
    if (this.state.current !== 'menu') return false;
    const difficulty = this.song.difficulties.find((candidate) => candidate.level === Number(level));
    if (!difficulty) return false;
    this.selectedDifficulty = difficulty;
    this.ui.updateDifficulty(difficulty);
    this.refreshRecord();
    return true;
  }

  createSessionChart() {
    const chart = this.song.createChart(this.selectedDifficulty.level);
    const errors = validateChart(chart);
    if (errors.length) throw new Error(`譜面資料錯誤：${errors[0]}`);
    return {
      ...chart,
      notes: chart.notes.map((note) => ({ ...note, judged: false, judgment: null, hitOffset: null })),
    };
  }

  async startNewSession() {
    if (!['menu', 'paused', 'result'].includes(this.state.current)) return;
    const token = ++this.sessionToken;
    this.state.transition('loading');
    this.resumePending = false;
    this.audio.stop();
    this.clearPressedLanes();
    this.ui.showPause(false);
    this.ui.showScreen('game');
    this.ui.showCountdown(null);
    this.ui.setLoading(true);
    this.ui.resetHud(this.song.duration);
    this.renderer.reset();

    try {
      this.chart = this.createSessionChart();
      this.stats = new SessionStats(this.chart.notes.length);
      this.ensureLoop();
      await nextPaint();
      if (token !== this.sessionToken || this.state.current !== 'loading') {
        this.audio.stop();
        return;
      }
      await this.audio.schedule(0, 3);
      if (token !== this.sessionToken || this.state.current !== 'loading') {
        this.audio.stop();
        return;
      }
      this.state.transition('countdown');
      this.ui.setLoading(false);
    } catch (error) {
      if (token !== this.sessionToken) return;
      this.audio.stop();
      this.stopLoop();
      if (this.state.current === 'loading') this.state.transition('menu');
      this.ui.setLoading(false);
      this.ui.showScreen('menu');
      this.ui.showError(error instanceof Error ? error.message : '無法啟動遊戲。');
    }
  }

  frame(now) {
    this.rafId = null;
    if (!this.chart || !this.stats) return;
    const currentState = this.state.current;
    let songTime = this.audio.songTime;

    if (currentState === 'countdown') {
      if (this.audio.hasStarted) {
        this.state.transition('playing');
        this.ui.showCountdown(null);
      } else {
        this.ui.showCountdown(this.audio.countdownRemaining);
      }
    }

    if (this.state.current === 'playing') {
      songTime = this.audio.songTime;
      const missed = resolveAutoMisses(this.chart.notes, songTime);
      for (const note of missed) {
        this.stats.apply('miss');
        this.renderer.addHitEffect(note.lane, 'miss');
        this.ui.showJudgment('miss');
      }

      if (songTime >= this.chart.duration) {
        this.finishSession();
        return;
      }
    }

    const snapshot = this.stats.snapshot();
    this.ui.updateHud(snapshot, songTime, this.chart.duration);
    this.renderer.render({
      songTime,
      chart: this.chart,
      stats: snapshot,
      pressedLanes: this.pressedLanes,
      scrollMultiplier: this.settings.scrollSpeed,
      state: this.state.current,
      now,
    });

    if (['loading', 'countdown', 'playing', 'paused'].includes(this.state.current)) {
      this.ensureLoop();
    }
  }

  ensureLoop() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.frame);
  }

  stopLoop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  handleLanePress(lane) {
    this.pressedLanes.add(lane);
    this.ui.setPressed(lane, true);
    if (this.state.current !== 'playing') return;

    const judgeTime = this.audio.songTime - clampOffsetMs(this.settings.audioOffsetMs) / 1000;
    const result = resolvePress(this.chart.notes, lane, judgeTime);
    if (!result) return;
    this.stats.apply(result.judgment, result.offset);
    this.audio.playHit(result.judgment);
    this.renderer.addHitEffect(lane, result.judgment);
    this.ui.showJudgment(result.judgment, result.timing);
  }

  handleLaneRelease(lane) {
    this.pressedLanes.delete(lane);
    this.ui.setPressed(lane, false);
  }

  clearPressedLanes() {
    for (const lane of this.pressedLanes) this.ui.setPressed(lane, false);
    this.pressedLanes.clear();
    this.input.clear();
  }

  togglePause() {
    if (this.ui.helpVisible) {
      this.ui.showHelp(false);
      return;
    }
    if (this.state.current === 'playing') {
      this.audio.pause();
      this.state.transition('paused');
      this.clearPressedLanes();
      this.ui.showCountdown(null);
      this.ui.syncSettings(this.settings);
      this.ui.showPause(true);
    } else if (this.state.current === 'paused') {
      this.resumeSession();
    }
  }

  async resumeSession() {
    if (this.state.current !== 'paused' || this.resumePending) return;
    this.resumePending = true;
    try {
      await this.audio.resume(3);
      if (this.state.current !== 'paused') return;
      this.state.transition('countdown');
      this.ui.showPause(false);
      this.ensureLoop();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      this.ui.showError(error instanceof Error ? error.message : '無法恢復音訊。');
    } finally {
      this.resumePending = false;
    }
  }

  restartFromShortcut() {
    if (this.state.current === 'paused' || this.state.current === 'result') {
      this.startNewSession();
    }
  }

  confirmCurrentScreen() {
    if (this.ui.helpVisible) {
      this.ui.showHelp(false);
      return;
    }
    if (this.state.current === 'menu' || this.state.current === 'result') {
      this.startNewSession();
    } else if (this.state.current === 'paused') {
      this.resumeSession();
    }
  }

  finishSession() {
    if (this.state.current !== 'playing') return;
    this.state.transition('result');
    this.audio.stop();
    this.stopLoop();
    this.clearPressedLanes();
    const result = this.stats.finalize();
    const difficultyId = this.chart.difficulty;
    const previous = this.saveStore.getRecord(this.song.id, difficultyId);
    const newRecord = !previous || result.score > previous.highScore;
    const record = this.saveStore.saveRecord(this.song.id, difficultyId, result);
    this.ui.updateRecord(record);
    this.ui.showResults(result, { passed: result.gauge > 0, newRecord });
  }

  returnToMenu() {
    if (this.state.current === 'menu') return;
    this.sessionToken += 1;
    this.audio.stop();
    this.stopLoop();
    this.clearPressedLanes();
    this.ui.showPause(false);
    this.ui.showCountdown(null);
    this.ui.setLoading(false);
    this.state.transition('menu');
    this.refreshRecord();
    this.ui.showScreen('menu');
  }

  onVisibilityChange() {
    if (document.hidden && this.state.current === 'playing') this.togglePause();
  }

  destroy() {
    this.sessionToken += 1;
    this.audio.stop();
    this.stopLoop();
    this.input.destroy();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
