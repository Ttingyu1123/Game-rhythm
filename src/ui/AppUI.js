import { buildTimingHistogram } from '../rendering/renderMath.js';

const OFFSET_CHART = Object.freeze({
  early: '#72d4cb',
  late: '#f188aa',
  center: '#efc96e',
  axis: 'rgba(225, 213, 255, 0.22)',
  text: 'rgba(170, 165, 194, 0.9)',
});

const JUDGMENT_LABELS = Object.freeze({
  marvelous: 'MARVELOUS',
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
});

const formatNumber = (value) => Math.round(value).toLocaleString('en-US');

const formatTime = (seconds) => {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export class AppUI {
  constructor(root = document) {
    this.root = root;
    this.elements = {};
    [
      'menu-screen', 'game-screen', 'result-screen', 'start-button', 'volume-slider',
      'speed-select', 'reduced-motion', 'offset-slider', 'offset-value',
      'best-grade', 'best-score', 'best-accuracy',
      'game-canvas', 'hud-score', 'hud-accuracy', 'hud-combo', 'hud-max-combo',
      'hud-gauge-fill', 'hud-gauge-value', 'hud-progress-fill', 'hud-time',
      'hud-judgment', 'hud-timing', 'countdown-overlay', 'pause-button',
      'pause-overlay', 'pause-volume', 'pause-speed', 'resume-button', 'restart-button',
      'quit-button', 'result-status', 'result-grade', 'new-record', 'result-score',
      'result-accuracy', 'result-combo', 'result-offset', 'result-marvelous',
      'result-perfect', 'result-great', 'result-good', 'result-miss', 'result-badge',
      'result-menu-button', 'replay-button', 'error-toast', 'touch-controls',
      'difficulty-description', 'song-difficulty', 'game-difficulty',
      'result-difficulty', 'record-difficulty', 'result-offset-chart',
      'result-offset-summary',
      'song-options', 'song-count', 'song-selection-status', 'song-chapter',
      'song-card-title', 'song-title-en', 'song-bpm', 'song-key', 'song-duration',
      'song-source-label', 'game-song-title', 'game-song-bpm', 'result-title',
      'result-song-en',
    ].forEach((id) => {
      this.elements[id] = root.getElementById(id);
    });
    this.difficultyButtons = [...root.querySelectorAll('[data-difficulty-level]')];
    this.songButtons = [];
    this.errorTimer = null;
  }

  renderSongCatalog(songs, selectedSongId) {
    const container = this.elements['song-options'];
    const fragment = this.root.createDocumentFragment();

    songs.forEach((song, index) => {
      const button = this.root.createElement('button');
      button.type = 'button';
      button.className = 'song-option';
      button.dataset.songId = song.id;
      button.setAttribute('aria-pressed', String(song.id === selectedSongId));

      const number = this.root.createElement('span');
      number.className = 'song-option__number';
      number.textContent = String(index + 1).padStart(2, '0');

      const copy = this.root.createElement('span');
      copy.className = 'song-option__copy';
      const title = this.root.createElement('strong');
      title.textContent = song.title;
      const titleEn = this.root.createElement('small');
      titleEn.textContent = song.titleEn;
      copy.append(title, titleEn);

      const details = this.root.createElement('span');
      details.className = 'song-option__details';
      details.textContent = `${song.bpm} BPM · ${formatTime(song.duration)}`;

      const status = this.root.createElement('span');
      status.className = 'song-option__status';
      status.textContent = song.id === selectedSongId ? '目前曲目' : '選擇';

      button.append(number, copy, details, status);
      fragment.append(button);
    });

    container.replaceChildren(fragment);
    this.songButtons = [...container.querySelectorAll('[data-song-id]')];
    this.elements['song-count'].textContent = `${songs.length} 首可遊玩`;
  }

  updateSong(song) {
    this.songButtons.forEach((button) => {
      const selected = button.dataset.songId === song.id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.song-option__status').textContent = selected ? '目前曲目' : '選擇';
    });

    this.elements['song-chapter'].textContent = song.chapter;
    this.elements['song-card-title'].textContent = song.title;
    this.elements['song-title-en'].textContent = song.titleEn;
    this.elements['song-bpm'].textContent = song.bpm;
    this.elements['song-key'].textContent = song.key;
    this.elements['song-duration'].textContent = formatTime(song.duration);
    this.elements['song-source-label'].textContent = `${song.sourceLabel} · ${song.artist}`;
    this.elements['game-song-title'].textContent = song.title;
    this.elements['game-song-bpm'].textContent = song.bpm;
    this.elements['result-title'].textContent = song.title;
    this.elements['result-song-en'].textContent = song.titleEn;
    this.elements['song-selection-status'].textContent = `已選擇${song.title}`;

    this.difficultyButtons.forEach((button) => {
      const difficulty = song.difficulties.find(
        ({ level }) => level === Number(button.dataset.difficultyLevel),
      );
      button.hidden = !difficulty;
      if (!difficulty) return;
      button.querySelector('strong').textContent = `Lv.${difficulty.level}`;
      button.querySelector('small').textContent = difficulty.label;
    });

    if (this.root.body) this.root.body.dataset.currentSongId = song.id;
  }

  showScreen(name) {
    ['menu', 'game', 'result'].forEach((screen) => {
      this.elements[`${screen}-screen`].hidden = screen !== name;
    });
    document.body.dataset.screen = name;
  }

  setLoading(isLoading) {
    const button = this.elements['start-button'];
    button.disabled = isLoading;
    button.querySelector('[data-button-label]').textContent = isLoading ? '正在編織樂曲…' : '開始月光試煉';
  }

  syncSettings(settings) {
    this.elements['volume-slider'].value = settings.masterVolume;
    this.elements['pause-volume'].value = settings.masterVolume;
    this.elements['speed-select'].value = settings.scrollSpeed;
    this.elements['pause-speed'].value = settings.scrollSpeed;
    this.elements['reduced-motion'].checked = Boolean(settings.reducedMotion);
    this.setAudioOffsetDisplay(settings.audioOffsetMs ?? 0);
  }

  setAudioOffsetDisplay(offsetMs) {
    const value = Math.round(offsetMs);
    this.elements['offset-slider'].value = value;
    this.elements['offset-value'].textContent = `${value > 0 ? '+' : ''}${value} ms`;
  }

  updateDifficulty(difficulty) {
    const displayName = `${difficulty.label} Lv.${difficulty.level}`;
    this.difficultyButtons.forEach((button) => {
      const selected = Number(button.dataset.difficultyLevel) === difficulty.level;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.elements['difficulty-description'].textContent = `${difficulty.noteCount} 顆 · ${difficulty.description}`;
    this.elements['song-difficulty'].textContent = displayName;
    this.elements['game-difficulty'].textContent = displayName;
    this.elements['result-difficulty'].textContent = displayName;
    this.elements['record-difficulty'].textContent = displayName;
    if (this.root.body) this.root.body.dataset.difficulty = difficulty.level;
  }

  updateRecord(record) {
    this.elements['best-grade'].textContent = record?.bestGrade ?? '—';
    this.elements['best-score'].textContent = record ? formatNumber(record.highScore) : '—';
    this.elements['best-accuracy'].textContent = record ? `${record.bestAccuracy.toFixed(2)}%` : '—';
  }

  resetHud(duration = 60) {
    this.updateHud({
      score: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      gauge: 50,
    }, 0, duration);
    this.elements['hud-judgment'].textContent = 'READY';
    this.elements['hud-judgment'].dataset.judgment = '';
    this.elements['hud-timing'].textContent = '跟著鼓點施法';
  }

  updateHud(stats, songTime, duration) {
    this.elements['hud-score'].textContent = formatNumber(stats.score).padStart(7, '0');
    this.elements['hud-accuracy'].textContent = `${stats.accuracy.toFixed(2)}%`;
    this.elements['hud-combo'].textContent = stats.combo;
    this.elements['hud-max-combo'].textContent = stats.maxCombo;
    this.elements['hud-gauge-value'].textContent = `${Math.round(stats.gauge)}%`;
    this.elements['hud-gauge-fill'].style.width = `${stats.gauge}%`;
    this.elements['hud-gauge-fill'].dataset.low = stats.gauge <= 20 ? 'true' : 'false';
    this.elements['hud-progress-fill'].style.width = `${Math.min(100, Math.max(0, songTime / duration * 100))}%`;
    this.elements['hud-time'].textContent = formatTime(duration - songTime);
  }

  showCountdown(remaining) {
    const overlay = this.elements['countdown-overlay'];
    if (remaining === null) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    overlay.textContent = Math.min(3, Math.max(1, Math.ceil(remaining)));
    overlay.dataset.value = overlay.textContent;
  }

  showJudgment(judgment, timing = null) {
    const label = this.elements['hud-judgment'];
    label.textContent = JUDGMENT_LABELS[judgment] ?? judgment.toUpperCase();
    label.dataset.judgment = judgment;
    label.classList.remove('judgment-pop');
    void label.offsetWidth;
    label.classList.add('judgment-pop');

    const timingLabel = this.elements['hud-timing'];
    timingLabel.textContent = judgment === 'miss'
      ? '符文消散'
      : timing === 'early'
        ? 'EARLY · 稍早'
        : timing === 'late'
          ? 'LATE · 稍晚'
          : 'ON TIME · 正中拍點';
  }

  setPressed(lane, pressed) {
    const button = this.root.querySelector(`[data-lane="${lane}"]`);
    button?.classList.toggle('is-pressed', pressed);
  }

  showPause(visible) {
    this.elements['pause-overlay'].hidden = !visible;
    if (visible) this.elements['resume-button'].focus();
  }

  showResults(result, { passed, newRecord }) {
    this.elements['result-status'].textContent = passed ? '試煉完成' : '魔力耗盡';
    this.elements['result-grade'].textContent = result.grade;
    this.elements['new-record'].hidden = !newRecord;
    this.elements['result-score'].textContent = formatNumber(result.score);
    this.elements['result-accuracy'].textContent = `${result.accuracy.toFixed(2)}%`;
    this.elements['result-combo'].textContent = result.maxCombo;
    this.elements['result-offset'].textContent = `${result.averageOffsetMs > 0 ? '+' : ''}${result.averageOffsetMs} ms`;
    Object.entries(result.counts).forEach(([judgment, count]) => {
      this.elements[`result-${judgment}`].textContent = count;
    });
    this.elements['result-badge'].textContent = result.allPerfect
      ? 'ALL PERFECT · 每一道符文都閃耀。'
      : result.fullCombo
        ? 'FULL COMBO · 月光從未中斷。'
        : passed
          ? `魔力剩餘 ${Math.round(result.gauge)}%，試煉通過。`
          : '放慢符文速度，再跟著重拍挑戰一次。';
    this.showScreen('result');
    this.drawOffsetHistogram(result.offsetsMs ?? []);
  }

  drawOffsetHistogram(offsetsMs) {
    const canvas = this.elements['result-offset-chart'];
    const summary = this.elements['result-offset-summary'];
    if (!canvas?.getContext) return;

    const histogram = buildTimingHistogram(offsetsMs);
    if (summary) {
      summary.textContent = histogram.total === 0
        ? '沒有命中資料'
        : `${histogram.total} 次命中 · 稍早 ${histogram.early} / 稍晚 ${histogram.late}`;
    }

    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const cssWidth = canvas.clientWidth || canvas.width;
    const cssHeight = canvas.clientHeight || canvas.height;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padX = 12;
    const padTop = 8;
    const baseline = cssHeight - 18;
    const usableWidth = cssWidth - padX * 2;
    const usableHeight = baseline - padTop;
    const centerX = cssWidth / 2;

    // Zero-timing reference line (perfect hit).
    ctx.strokeStyle = OFFSET_CHART.center;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, padTop);
    ctx.lineTo(centerX, baseline);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Baseline axis.
    ctx.strokeStyle = OFFSET_CHART.axis;
    ctx.beginPath();
    ctx.moveTo(padX, baseline + 0.5);
    ctx.lineTo(cssWidth - padX, baseline + 0.5);
    ctx.stroke();

    if (histogram.total === 0) {
      ctx.fillStyle = OFFSET_CHART.text;
      ctx.font = '13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('這一輪沒有命中任何符文', centerX, padTop + usableHeight / 2);
      return;
    }

    const slot = usableWidth / histogram.bins.length;
    const barWidth = Math.max(2, slot * 0.72);
    histogram.bins.forEach((bin, index) => {
      if (bin.count === 0) return;
      const height = (bin.count / histogram.maxCount) * usableHeight;
      const x = padX + slot * (index + 0.5) - barWidth / 2;
      const y = baseline - height;
      ctx.fillStyle = bin.centerMs === 0
        ? OFFSET_CHART.center
        : bin.centerMs < 0
          ? OFFSET_CHART.early
          : OFFSET_CHART.late;
      ctx.fillRect(x, y, barWidth, height);
    });

    // Range ticks at the window edge.
    ctx.fillStyle = OFFSET_CHART.text;
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`-${histogram.rangeMs}ms`, padX, cssHeight - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`+${histogram.rangeMs}ms`, cssWidth - padX, cssHeight - 4);
    ctx.textAlign = 'center';
    ctx.fillText('0', centerX, cssHeight - 4);
  }

  showError(message) {
    clearTimeout(this.errorTimer);
    const toast = this.elements['error-toast'];
    toast.textContent = message;
    toast.hidden = false;
    this.errorTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6000);
  }
}
