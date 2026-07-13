import { LANES, LANE_META } from '../config.js';
import { noteYAtTime } from './renderMath.js';

const COLORS = Object.freeze({
  left: '#78d7cf',
  down: '#f0c66b',
  up: '#d59cff',
  right: '#ff8fb1',
});

const JUDGMENT_COLORS = Object.freeze({
  marvelous: '#fff4b0',
  perfect: '#f3c96b',
  great: '#83e3ff',
  good: '#d8d7eb',
  miss: '#ff6f91',
});

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function pseudoRandom(index, salt = 0) {
  const value = Math.sin(index * 91.733 + salt * 37.117) * 43758.5453;
  return value - Math.floor(value);
}

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.effects = [];
    this.reducedMotion = false;
    this.stars = Array.from({ length: 70 }, (_, index) => ({
      x: pseudoRandom(index, 1),
      y: pseudoRandom(index, 2),
      size: 0.7 + pseudoRandom(index, 3) * 1.8,
      phase: pseudoRandom(index, 4) * Math.PI * 2,
    }));
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
  }

  reset() {
    this.effects.length = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 600);
    const height = Math.max(400, rect.height || 720);
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = width;
    this.height = height;
  }

  getLayout() {
    const trackWidth = Math.min(560, this.width * 0.88);
    const trackLeft = (this.width - trackWidth) / 2;
    const laneWidth = trackWidth / LANES.length;
    return {
      trackWidth,
      trackLeft,
      laneWidth,
      hitLineY: this.height * 0.79,
      top: this.height * 0.04,
      bottom: this.height * 0.94,
    };
  }

  laneCenter(lane, layout = this.getLayout()) {
    return layout.trackLeft + (LANES.indexOf(lane) + 0.5) * layout.laneWidth;
  }

  addHitEffect(lane, judgment) {
    const createdAt = performance.now();
    this.effects.push({ lane, judgment, createdAt });
    if (this.effects.length > 28) this.effects.splice(0, this.effects.length - 28);
  }

  render({ songTime, chart, stats, pressedLanes, scrollMultiplier = 1, state = 'playing', now = performance.now() }) {
    this.resize();
    const ctx = this.ctx;
    const layout = this.getLayout();
    const beat = songTime * chart.bpm / 60;
    const pulse = this.reducedMotion ? 0 : Math.max(0, 1 - (beat % 1) * 4) ** 2;

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx, beat, pulse, now);
    this.drawTracks(ctx, layout, pressedLanes, pulse);
    this.drawNotes(ctx, layout, chart, songTime, scrollMultiplier);
    this.drawJudgmentLine(ctx, layout, pressedLanes, pulse);
    this.drawEffects(ctx, layout, now);

    if (state === 'paused') {
      ctx.fillStyle = 'rgba(5, 7, 19, 0.28)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (stats.combo >= 50 && !this.reducedMotion) {
      ctx.strokeStyle = `rgba(243, 201, 107, ${0.08 + pulse * 0.09})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, this.width - 10, this.height - 10);
    }
  }

  drawBackground(ctx, beat, pulse, now) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#10112b');
    gradient.addColorStop(0.55, '#171431');
    gradient.addColorStop(1, '#080a18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const moonX = this.width * 0.5;
    const moonY = this.height * 0.13;
    const moonRadius = Math.min(this.width, this.height) * (0.12 + pulse * 0.004);
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 1.7);
    moonGlow.addColorStop(0, 'rgba(255, 240, 184, 0.28)');
    moonGlow.addColorStop(0.45, 'rgba(185, 158, 255, 0.09)');
    moonGlow.addColorStop(1, 'rgba(83, 65, 150, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 242, 193, 0.1)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    for (const star of this.stars) {
      const shimmer = this.reducedMotion ? 0.65 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0018 + star.phase));
      ctx.fillStyle = `rgba(230, 220, 255, ${shimmer * 0.55})`;
      ctx.beginPath();
      ctx.arc(star.x * this.width, star.y * this.height * 0.7, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(5, 7, 19, 0.78)';
    const skylineY = this.height * 0.88;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, skylineY);
    for (let x = 0, index = 0; x <= this.width; x += this.width / 12, index += 1) {
      const tower = skylineY - (index % 3 === 0 ? 55 : 20) - pseudoRandom(index, 8) * 35;
      ctx.lineTo(x, skylineY);
      ctx.lineTo(x + this.width / 24, tower);
      ctx.lineTo(x + this.width / 12, skylineY);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
  }

  drawTracks(ctx, layout, pressedLanes, pulse) {
    roundedRect(ctx, layout.trackLeft, layout.top, layout.trackWidth, layout.bottom - layout.top, 26);
    ctx.fillStyle = 'rgba(8, 8, 25, 0.72)';
    ctx.fill();
    ctx.strokeStyle = `rgba(213, 180, 255, ${0.23 + pulse * 0.11})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    LANES.forEach((lane, index) => {
      const x = layout.trackLeft + index * layout.laneWidth;
      const isPressed = pressedLanes.has(lane);
      const laneGradient = ctx.createLinearGradient(0, layout.top, 0, layout.bottom);
      laneGradient.addColorStop(0, 'rgba(255,255,255,0.015)');
      laneGradient.addColorStop(1, isPressed ? `${COLORS[lane]}30` : `${COLORS[lane]}0b`);
      ctx.fillStyle = laneGradient;
      ctx.fillRect(x + 2, layout.top + 2, layout.laneWidth - 4, layout.bottom - layout.top - 4);

      ctx.strokeStyle = `${COLORS[lane]}22`;
      ctx.lineWidth = 1;
      for (let y = layout.top + 34 + index * 9; y < layout.bottom; y += 72) {
        ctx.beginPath();
        ctx.moveTo(x + layout.laneWidth * 0.22, y);
        ctx.lineTo(x + layout.laneWidth * 0.78, y + (index % 2 ? 12 : -12));
        ctx.stroke();
      }

      if (index > 0) {
        ctx.strokeStyle = 'rgba(220, 211, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(x, layout.top + 12);
        ctx.lineTo(x, layout.bottom - 12);
        ctx.stroke();
      }
    });
  }

  drawNotes(ctx, layout, chart, songTime, scrollMultiplier) {
    const pixelsPerSecond = chart.scrollSpeed * scrollMultiplier;
    const noteSize = Math.min(58, layout.laneWidth * 0.58);

    for (const note of chart.notes) {
      if (note.judged) continue;
      const y = noteYAtTime({
        hitLineY: layout.hitLineY,
        noteTime: note.time,
        songTime,
        pixelsPerSecond,
      });
      if (y < layout.top - noteSize || y > layout.bottom + noteSize) continue;
      this.drawRune(ctx, this.laneCenter(note.lane, layout), y, note.lane, noteSize, 1);
    }
  }

  drawRune(ctx, x, y, lane, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = COLORS[lane];
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(19, 17, 48, 0.94)';
    ctx.strokeStyle = COLORS[lane];
    ctx.lineWidth = 3;

    ctx.beginPath();
    if (lane === 'left') {
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, 0);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(-size / 2, 0);
      ctx.closePath();
    } else if (lane === 'down') {
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    } else if (lane === 'up') {
      ctx.moveTo(0, -size * 0.56);
      ctx.lineTo(size * 0.52, size * 0.4);
      ctx.lineTo(-size * 0.52, size * 0.4);
      ctx.closePath();
    } else {
      roundedRect(ctx, -size / 2, -size / 2, size, size, size * 0.16);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff9df';
    ctx.font = `700 ${Math.round(size * 0.56)}px "Palatino Linotype", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LANE_META[lane].symbol, 0, 1);
    ctx.restore();
  }

  drawJudgmentLine(ctx, layout, pressedLanes, pulse) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 231, 153, ${0.7 + pulse * 0.3})`;
    ctx.shadowColor = '#e8c9ff';
    ctx.shadowBlur = 18 + pulse * 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(layout.trackLeft + 10, layout.hitLineY);
    ctx.lineTo(layout.trackLeft + layout.trackWidth - 10, layout.hitLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    LANES.forEach((lane) => {
      const center = this.laneCenter(lane, layout);
      const radius = Math.min(39, layout.laneWidth * 0.35);
      ctx.fillStyle = pressedLanes.has(lane) ? `${COLORS[lane]}50` : 'rgba(9, 8, 25, 0.88)';
      ctx.strokeStyle = pressedLanes.has(lane) ? COLORS[lane] : `${COLORS[lane]}88`;
      ctx.lineWidth = pressedLanes.has(lane) ? 4 : 2;
      ctx.beginPath();
      ctx.arc(center, layout.hitLineY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 249, 226, 0.88)';
      ctx.font = `700 ${Math.round(radius * 1.05)}px "Palatino Linotype", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_META[lane].symbol, center, layout.hitLineY + 1);
    });
    ctx.restore();
  }

  drawEffects(ctx, layout, now) {
    const lifetime = this.reducedMotion ? 220 : 620;
    this.effects = this.effects.filter((effect) => now - effect.createdAt < lifetime);

    for (const effect of this.effects) {
      const age = (now - effect.createdAt) / lifetime;
      const centerX = this.laneCenter(effect.lane, layout);
      const color = JUDGMENT_COLORS[effect.judgment] ?? '#ffffff';
      const radius = 24 + age * (this.reducedMotion ? 20 : 82);
      ctx.save();
      ctx.globalAlpha = 1 - age;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4 * (1 - age) + 1;
      ctx.beginPath();
      ctx.arc(centerX, layout.hitLineY, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (!this.reducedMotion) {
        for (let index = 0; index < 6; index += 1) {
          const angle = index / 6 * Math.PI * 2 + pseudoRandom(index, effect.createdAt) * 0.3;
          const distance = age * 70;
          const x = centerX + Math.cos(angle) * distance;
          const y = layout.hitLineY + Math.sin(angle) * distance;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 3 * (1 - age), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}
